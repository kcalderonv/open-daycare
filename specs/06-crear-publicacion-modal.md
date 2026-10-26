# SPEC 06 — Modal para crear publicación

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02, SPEC 05
> **Date:** 2026-10-26
> **Objective:** Implementar `crear-publicacion.dc.html` como un único modal que abren los tres accesos de "Nueva publicación", con destinatarios múltiples, "Toda la sala" excluyente y validación de destinatarios, tipo, descripción y fotos, sin persistencia.

## Por qué existe esta spec

- El CTA "Nueva publicación" existe en tres lugares y los tres son enlaces muertos: el sidebar (`app-sidebar.tsx`), el header móvil (`app-shell.tsx`) y la caja "Compartí un momento…" del feed (`feed-composer.tsx`). El mockup enlaza los tres a `crear-publicacion.dc.html`.
- Es el primer modal compartido por varios disparadores. `FormDialog` (SPEC 05) monta su propio `<button>` disparador, así que no sirve tal cual para tres accesos en zonas distintas del shell.
- "Toda la sala" introduce una regla de selección que no existe en el resto de la app: expandir internamente a los 8 niños y, aun así, pintar un solo chip activo.

## Scope

**In:**

- `app/_components/ui/modal-dialog.tsx`: nuevo client component con la mecánica del `<dialog>` extraída de `FormDialog` (showModal, trampa de Tab, cierre por scrim/Escape, foco inicial, reset del `<form>`). Expone `open()`/`close()` por `ref` (React 19, ref como prop) y un `onClose` opcional.
- `app/_components/ui/form-dialog.tsx`: pasa a envolver `ModalDialog`. API pública intacta (`triggerContent`, `triggerClassName`, `titleId`, `initialFocusId`, `children`, `useFormDialogClose`).
- `app/_components/ui/form-field.tsx`: `FormTextArea` suma dos props opcionales, `labelEnd?: ReactNode` (contador a la derecha del label) y `className?: string` (reemplaza el alto por defecto `min-h-[90px]` cuando se pasa; el resto de las clases base se mantiene). Las dos son aditivas: `child-form.tsx` y `parent-invite-form.tsx` no cambian.
- `app/_components/feed/post-composer-provider.tsx`: nuevo client component con el contexto `usePostComposer()` y el único `<dialog>` de la app montado una sola vez. Remonta `PostForm` con una `key` en cada `close` para que el formulario vuelva vacío.
- `app/_components/feed/post-composer-trigger.tsx`: nuevo client component `<button type="button">` que abre el modal. Recibe `className`, `children` y `ariaLabel` opcional.
- `app/_components/feed/post-form.tsx`: nuevo client component con la tarjeta de `crear-publicacion.dc.html` (header Cancelar / "Nueva publicación" / Publicar, PARA, TIPO, DESCRIPCIÓN, FOTOS) y toda la validación.
- `app/_data/post-composer.ts`: los 7 tipos con sus clases, límites de descripción, reglas de fotos, `wholeRoomLabel` y `audienceChipId()`.
- `app/_components/children/child-avatar.tsx`: nueva talla `xs` (`size-[26px] text-[13px]`) para el avatar de los chips.
- `app/_components/app-sidebar.tsx`, `app/_components/app-shell.tsx`, `app/_components/feed/feed-composer.tsx`: los tres `Link href="#"` pasan a `PostComposerTrigger` conservando las clases visuales actuales (el composer suma `w-full cursor-pointer text-left`).
- `app/(app)/layout.tsx`: envuelve `AppShell` con `PostComposerProvider` (el provider tiene que quedar por encima del sidebar, que es hermano del contenido).
- `app/globals.css`: 2 tokens nuevos (paleta Siesta).
- Degradación: la tarjeta mide `max-w-[580px]`, deja 16px de margen bajo `sm`, hace wrap de chips y scrollea por dentro.

**Out of scope (para specs futuras):**

- Crear, guardar, editar o borrar publicaciones: "Publicar" solo valida y cierra.
- Subida real de imágenes, almacenamiento, compresión o validación en servidor.
- Edición desde los enlaces "Editar" de cada post.
- Toasts, estados de carga, estados de éxito y borradores persistentes.
- Reutilizar `postTypes` en `PostKind` o en el feed: los 3 badges actuales no cambian y la publicación creada no aparece en "PUBLICADO HOY".
- Destinatarios que no sean niños o la sala: no hay padres, grupos ni otras salas.
- `proxy.ts`, rutas nuevas y `generateStaticParams`.

## Data model

Sin persistencia. Un archivo de datos nuevo y dos tipos de estado local dentro de `PostForm`.

```ts
// app/_data/post-composer.ts
export type PostTypeId =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type PostTypeOption = {
  id: PostTypeId;
  label: string;
  idleClassName: string;
  activeClassName: string;
};

export const postTypes: readonly PostTypeOption[];

export const wholeRoomLabel = "Toda la sala";

export const descriptionLimits = { min: 10, max: 600 } as const;

export const photoRules = {
  max: 4,
  accept: "image/jpeg,image/png,image/webp",
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxBytes: 5 * 1024 * 1024,
} as const;

export function audienceChipId(childId: string): string; // `post-audience-${childId}`
```

Valores de `postTypes`, en orden del mockup. El activo usa el tono fuerte como fondo con texto blanco; el inactivo usa el pastel con el texto del tono:

| id            | label     | idleClassName                                       | activeClassName                          |
| ------------- | --------- | --------------------------------------------------- | ---------------------------------------- |
| `meal`        | Comida    | `bg-badge-pending-bg text-badge-pending`             | `bg-badge-pending text-white`            |
| `nap`         | Siesta    | `bg-post-type-nap-bg text-post-type-nap-fg`          | `bg-post-type-nap-fg text-white`         |
| `activity`    | Actividad | `bg-badge-activity-bg text-badge-activity`           | `bg-badge-activity text-white`           |
| `achievement` | Logro     | `bg-badge-achievement-bg text-badge-achievement`     | `bg-badge-achievement text-white`        |
| `mood`        | Ánimo     | `bg-tag-link-bg text-tag-link-fg`                    | `bg-tag-link-fg text-white`              |
| `photo`       | Foto      | `bg-tag-allergy-bg text-tag-allergy-fg`              | `bg-tag-allergy-fg text-white`           |
| `announcement`| Anuncio   | `bg-badge-announcement-bg text-badge-announcement`   | `bg-badge-announcement text-white`       |

Estado local de `PostForm` (nada sale del componente):

```ts
// Selección de destinatarios. "room" no duplica ids: se resuelven.
export type AudienceState = {
  wholeRoom: boolean;
  childIds: string[];
};

export function resolvedAudienceIds(selection: AudienceState): string[] {
  return selection.wholeRoom ? children.map((child) => child.id) : selection.childIds;
}

type PostField = "audience" | "postType" | "description";

type PostErrors = Partial<Record<PostField, string>> & { photos?: string };

type SelectedPhoto = { id: string; name: string; url: string }; // url = URL.createObjectURL(file)
```

Convenciones:

- **`wholeRoom: true` implica `childIds` vacío.** Los ids de los 8 niños se derivan con `resolvedAudienceIds`, no se guardan.
- **Visual y estado no son lo mismo:** un chip de niño se pinta activo solo si `!wholeRoom && childIds.includes(id)`.
- `postType` arranca en `null`; no hay default.
- `description` es controlada (`string`), para poder pintar el contador.
- `photos` es un array de URLs `blob:`; no se envía nada a red.
- `PostKind` (`achievement | activity | announcement`) **no se toca**. Los 7 tipos del composer son solo UI hasta que exista una spec de persistencia.

Contratos de los componentes nuevos:

```ts
// post-composer-provider.tsx — "use client"
type PostComposerProviderProps = { children: ReactNode };
export function PostComposerProvider(props: PostComposerProviderProps): ReactElement;
export function usePostComposer(): () => void; // abre el modal; lanza si no hay provider

// post-composer-trigger.tsx — "use client"
type PostComposerTriggerProps = {
  className: string;
  children: ReactNode;
  ariaLabel?: string;
};

// post-form.tsx — "use client"
type PostFormProps = { onClose: () => void };

// ui/modal-dialog.tsx — "use client"
export type ModalDialogHandle = { open: () => void; close: () => void };
type ModalDialogProps = {
  titleId: string;
  initialFocusId?: string; // sin id: enfoca el primer control focusable
  onClose?: () => void;
  children: ReactNode;
  ref?: Ref<ModalDialogHandle>;
};
```

## Tokens y medidas

Dos tokens nuevos en `@theme` de `app/globals.css`:

| Token                      | Valor     | Uso                                                     |
| -------------------------- | --------- | ------------------------------------------------------- |
| `--color-post-type-nap-bg` | `#e7dcf6` | fondo del chip Siesta inactivo                          |
| `--color-post-type-nap-fg` | `#7b5fc0` | texto del chip Siesta inactivo y fondo del activo       |

Tokens existentes reutilizados: `auth-bg` (#FBF4EC, tarjeta), `border`, `auth-input-border`, `shadow-dialog`, `muted`, `ink`, `nav`, `surface`, `eyebrow` (#D9583C, "Publicar"), `coral` (foco), `placeholder`, `divider`, `photo-bg`, `photo-border`, `photo-text`, `coral-link`, `error`, `badge-pending*`, `badge-activity*`, `badge-achievement*`, `badge-announcement*`, `tag-link-*`, `tag-allergy-*`, `child-*-bg/fg` (avatares).

Medidas del modal (mockup a 1440, tarjeta de 580):

- `<dialog>`: `fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0`, `backdrop:bg-ink/45`. Un solo `<dialog>` en el DOM.
- Overlay interno: `flex min-h-dvh items-start justify-center overflow-y-auto p-4 sm:px-6 sm:py-10`.
- Tarjeta: `w-full max-w-[580px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog`.
- Header: `flex items-center justify-between gap-3 border-b border-border px-[26px] py-5`. "Cancelar" `text-[15px] font-bold text-muted`; título `<h2 id="post-form-title">` `whitespace-nowrap font-display text-[16px] font-semibold text-ink sm:text-[18px]` (baja a 16px bajo `sm` para no partirse en dos líneas en 390px); "Publicar" `text-[15px] font-extrabold text-eyebrow`. Los tres con `cursor-pointer` y `focus-visible:ring-2 ring-coral ring-offset-2`.
- Cuerpo: `px-[26px] py-6`.
- Label de sección: `mb-[10px] block text-[12px] font-extrabold tracking-[.7px] text-muted`; separación entre bloques `22px`.
- Fila de chips: `flex flex-wrap gap-[9px]`.
- Chip de niño: `flex items-center gap-2 rounded-full border-[1.5px] py-1.5 pl-1.5 pr-3.5 text-sm font-bold`, avatar `ChildAvatar size="xs"` (26px). Activo `border-ink bg-ink text-white`; inactivo `border-border bg-surface text-nav`. El avatar conserva su tono en ambos estados.
- Chip "Toda la sala": mismo estilo sin avatar, `px-4 py-1.5 text-sm font-bold`.
- Chip de tipo: `rounded-full px-4 py-2 text-[13.5px] font-extrabold`, sin borde, anillo de foco coral.
- Textarea: `min-h-[120px] resize-y rounded-[14px] border-[1.5px] border-auth-input-border bg-white px-4 py-[14px] text-[15px] leading-[1.5]`, `focus:border-coral`. Contador `text-[12px] font-extrabold text-muted`, `text-error` al pasarse de 600.
- Fotos: azulejos `size-24 rounded-[14px]`. Preview `relative overflow-hidden border border-border bg-photo-bg` con `<img className="size-full object-cover">` y botón de quitar `absolute right-1 top-1 size-6 rounded-full bg-ink/70 text-white`. Azulejo "Agregar": `flex flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-photo-border bg-photo-bg text-[12px] text-photo-text`, `PlusIcon` 22px `text-coral-link`. Se oculta con 4 fotos.
- Foco: `focus-visible:ring-2 focus-visible:ring-coral` en chips, azulejos, botones y CTA; offset 2px en header y azulejos.

## Reglas de validación

Validación propia con `noValidate`. A diferencia de SPEC 04/05, acá **no se usa `FormData`**: audiencia, tipo y descripción viven en estado controlado y se validan desde ahí. Cada `<fieldset>` lleva `aria-required="true"` como semántica para lectores de pantalla.

### Campos y mensajes

| Control              | Regla                                            | Mensaje                                              |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| Destinatarios (PARA) | al menos 1: sala activa o ≥1 niño marcado        | Elegí al menos un destinatario.                      |
| TIPO                 | requerido, exactamente 1 de los 7                | Elegí un tipo de publicación.                        |
| DESCRIPCIÓN          | requerida tras `trim`                            | Contá cómo le fue hoy.                               |
|                      | mínimo 10 tras `trim`                            | La descripción debe tener al menos 10 caracteres.    |
|                      | máximo 600 (sin `maxLength` nativo)              | La descripción no puede superar los 600 caracteres.  |
| FOTOS                | opcional; máximo 4 en total                      | Podés agregar hasta 4 fotos.                         |
|                      | solo `image/jpeg`, `image/png`, `image/webp`     | Solo podés subir imágenes JPG, PNG o WebP.           |
|                      | máximo 5 MB por archivo                          | Cada foto debe pesar menos de 5 MB.                  |
|                      | sin reglas cruzadas con TIPO ni con destinatarios | —                                                   |

### Momento de la validación

- **Al enviar:** se validan audiencia, tipo y descripción en ese orden. Con errores no se cierra el modal; se setean los mensajes y el foco va al primer control inválido (`post-audience-<primer niño>`, `post-type-meal`, `post-description`).
- **Después del primer envío fallido:** cada campo con error se revalida en `onChange` y el mensaje desaparece al quedar válido. Los campos sin error no se validan mientras se tipean.
- **FOTOS se valida al elegir archivos**, no al enviar: un archivo inválido se descarta, los válidos se agregan hasta el límite y el mensaje aparece bajo la sección con `role="alert"`. El mensaje se limpia en la siguiente selección sin rechazos.
- **Al reabrir:** el modal se remonta vacío (sin chips activos, sin tipo, sin texto, sin fotos, sin errores).
- **Cerrar sin validar:** "Cancelar", Escape, clic en el scrim y el remonte por `key` descartan todo. "Publicar" es `type="submit"`; Enter valida igual que Publicar.
- **Fotos al quitar:** `URL.revokeObjectURL` en cada quitar y en el cleanup de desmontaje.

### Accesibilidad de los grupos

- Audiencia: `<fieldset>` con `<legend>` visual "PARA"; cada chip es `<input type="checkbox" name="audience" className="peer sr-only">` dentro de un `<label>`, y el chip es un `<span>` con `peer-checked:`. "Toda la sala" usa `value="room"` e `id="post-audience-room"`.
- Tipo: `<fieldset>` con `<legend>` "TIPO" y `<input type="radio" name="postType" value={id} className="peer sr-only">`.
- El error de cada grupo es `<p id="post-audience-error|post-type-error" role="alert">` y el `<fieldset>` lo referencia con `aria-describedby` (no se usa `aria-invalid` en `fieldset`, que no es válido).
- Contador: `<span id="post-description-count">0/600</span>` en el `labelEnd` del `FormTextArea`; el textarea lo referencia con `aria-describedby`.
- Fotos: `<input type="file" id="post-photos" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Agregar fotos">`; el azulejo es su `<label htmlFor="post-photos">` y muestra el anillo con `peer-focus-visible`. Cada preview tiene `alt="Foto seleccionada N"` y su botón `aria-label="Quitar foto N"`.

## Convenciones de código

Se mantienen las de SPEC 01–05: identificadores en inglés, copy en español, named exports, un componente principal por archivo, sin `any`, sin `style={{}}` ni hex en el JSX, server components por defecto.

Específicas de esta spec:

- **Client components nuevos y acotados:** `post-composer-provider.tsx`, `post-composer-trigger.tsx`, `post-form.tsx` y `ui/modal-dialog.tsx`. Con los seis preexistentes (`app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx`, `form-dialog.tsx`, `child-form.tsx`, `parent-invite-form.tsx`), `grep -rln '"use client"' app/` devuelve 10 archivos.
- **Un diálogo, tres disparadores.** El `<dialog>` vive en el provider montado en `(app)/layout.tsx`; los triggers solo llaman a `usePostComposer()`. Motivo: el sidebar es `hidden` bajo `shell`, así que un diálogo dentro del sidebar no se mostraría en móvil.
- **Sin estado global.** El único estado es local a `PostForm`; el provider solo guarda la `key` de sesión del formulario.
- **Sin duplicar la trampa de foco.** `ModalDialog` concentra `showModal`, `Tab`/`Shift+Tab`, cierre por scrim y reset; `FormDialog` la reutiliza y `PostForm` solo aporta contenido.
- **La paleta de tipos vive en datos**, no en el JSX: `postTypes[].idleClassName/activeClassName` son strings literales para que Tailwind los detecte.
- **`<img>` nativo para las previews**, con `// eslint-disable-next-line @next/next/no-img-element` justificado: `next/image` no puede optimizar `blob:` y la regla lo marcaría.
- **Foco inicial:** `post-audience-${children[0].id}`.
- **Publicar no navega ni agrega nada:** `preventDefault()` siempre.

## Implementation plan

1. **Mecánica de diálogo compartida.** Crear `ui/modal-dialog.tsx` con el `<dialog>`, overlay, trampa de Tab, cierre por scrim, `onClose` y `open()/close()` por ref; migrar `form-dialog.tsx` a envolverlo sin cambiar su API. Test: `/ninos` y un perfil abren/cierran sus modales, Escape resetea, `npx tsc --noEmit` limpio.
2. **Datos y tokens.** Crear `_data/post-composer.ts` y los 2 tokens Siesta en `@theme`. Test: `npm run build` y el feed no cambia.
3. **Avatar xs.** Agregar la talla `xs` a `child-avatar.tsx`. Test: `npx tsc --noEmit` limpio y `/ninos` sigue igual.
4. **Provider y trigger.** Crear `post-composer-provider.tsx` (contexto + `<ModalDialog>` + `PostForm` con `key`) y `post-composer-trigger.tsx`; montar el provider en `(app)/layout.tsx` envolviendo `AppShell`. Test: build y navegación sin errores.
5. **Cascarón del formulario.** `post-form.tsx` estático con tarjeta, header, labels y los 4 bloques con datos reales, sin estado de edición. Test: abrir desde un trigger provisorio muestra el diseño completo.
6. **Audiencia.** Estado `{ wholeRoom, childIds }`, toggle de niños, sala excluyente y salida de sala al tocar un niño. Test manual: sala → solo sala activa; tocar Sofía → solo Sofía; tocar Mateo → Sofía + Mateo; desmarcar todo → nada.
7. **Tipo.** Radios controlados, un solo tipo, activo sólido e inactivo pastel. Test: elegir Siesta deja Comida en pastel.
8. **Descripción.** Controlada con contador `n/600` y estado de error por encima del máximo. Test: pegar 601 caracteres.
9. **Fotos.** Input file oculto, validación de tipo/tamaño/cantidad, previews, quitar, revoke y limpieza del input tras cada selección. Test: 2 válidas → 1 se quita; PDF rechazado; 6 MB rechazado.
10. **Validación y cierre.** `validateAudience`, `validatePostType`, `validateDescription`, `FIELD_ORDER`, submit con foco al primero inválido, revalidación en `onChange` y cierre tras éxito. Test: enviar vacío muestra los 3 errores en orden y enfoca el primer chip.
11. **Tres disparadores reales.** Sidebar, header móvil y composer pasan a `PostComposerTrigger` con sus clases. Test: los tres abren el mismo `<dialog>` y la URL no cambia.
12. **Responsive y a11y.** Wrap de chips, `max-h` con scroll interno, anillos de foco y los `aria-*`. Test con Playwright a 390×600 y 1440×900.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npx eslint app` sin errores.
- [x] La consola no muestra errores ni warnings de React en `/` con el modal abierto y cerrado.
- [x] `app/` no importa nada de `references/`.
- [x] `app/(app)/page.tsx` sigue en `/`: no hay rutas nuevas ni cambios en `proxy.ts`.
- [x] En `/` hay exactamente un `<dialog>` en el DOM, aunque haya tres disparadores.
- [x] Los tres disparadores ("Nueva publicación" del sidebar, "Nueva publicación" del header móvil y "Compartí un momento…") son `<button type="button">` y no cambian la URL al hacer clic.
- [x] El composer del feed ya no es un `<a>` y conserva su diseño (avatar, texto e icono).
- [x] El modal abierto tiene `aria-labelledby="post-form-title"` y un `<h2>` con el texto "Nueva publicación".
- [x] El header muestra "Cancelar", "Nueva publicación" y "Publicar" en ese orden.
- [x] Los labels literales `PARA`, `TIPO`, `DESCRIPCIÓN` y `FOTOS` están presentes.
- [x] PARA muestra 9 chips: los 8 niños con su inicial (M, S, B, V, T, E, L, O) y "Toda la sala", en ese orden.
- [x] Al abrir, ningún chip de niño, ni "Toda la sala", ni ningún TIPO está activo, y la descripción está vacía con el placeholder "Contá cómo le fue hoy…".
- [x] El foco inicial está en el primer chip de niño.
- [x] Al hacer clic en "Toda la sala", queda activo solo ese chip; los 8 chips de niño se ven inactivos.
- [x] Con "Toda la sala" activa y TIPO y descripción completos, "Publicar" no muestra error de destinatarios (internamente hay 8 seleccionados) y cierra el modal.
- [x] Con "Toda la sala" activa, al hacer clic en un niño se desactiva la sala y queda activo solo ese niño.
- [x] Con un niño activo, al hacer clic en "Toda la sala" se desactivan todos los niños y queda activa la sala.
- [x] Con dos niños activos, desmarcar uno deja el otro; desmarcar ambos y publicar muestra "Elegí al menos un destinatario." con foco en el primer chip.
- [x] El TIPO permite exactamente uno: elegir otro desactiva el anterior.
- [x] El TIPO activo usa fondo sólido con texto blanco y los inactivos su pastel con el texto del tono.
- [x] Publicar con TIPO sin elegir muestra "Elegí un tipo de publicación."
- [x] Publicar con descripción vacía muestra "Contá cómo le fue hoy.".
- [x] Publicar con 5 caracteres muestra "La descripción debe tener al menos 10 caracteres.".
- [x] El contador arranca en `0/600`, se actualiza al tipear y pasa a color de error por encima de 600; publicar con 601 muestra "La descripción no puede superar los 600 caracteres.".
- [x] Enviar vacío muestra los tres errores a la vez y el foco queda en el primer chip de niño.
- [x] Cada error desaparece en cuanto su campo queda válido, sin volver a enviar.
- [x] El selector de fotos acepta JPG, PNG y WebP; un `.pdf` es rechazado con "Solo podés subir imágenes JPG, PNG o WebP.".
- [x] Un archivo de más de 5 MB es rechazado con "Cada foto debe pesar menos de 5 MB.".
- [x] Seleccionar 5 archivos válidos a la vez agrega 4 y muestra "Podés agregar hasta 4 fotos.".
- [x] Con 4 fotos, el azulejo "Agregar" no se renderiza.
- [x] Cada preview se puede quitar y desaparece del formulario.
- [x] No hay peticiones de red al elegir fotos: las previews usan `blob:`.
- [x] "Cancelar" cierra sin validar y sin mostrar errores.
- [x] Escape y clic en el scrim cierran el modal.
- [x] Al reabrir después de cerrar, no queda nada cargado: sin chips activos, sin tipo, descripción vacía, contador en `0/600`, sin fotos y sin errores.
- [x] A 390×600 el modal entra, scrollea por dentro, los chips hacen wrap y no hay scroll horizontal.
- [x] Los dos modales existentes (niño y padre) siguen abriendo, cerrando por Escape y reseteando después del refactor de `ModalDialog`.

## Decisions

- **Sí:** un único `<dialog>` montado en `(app)/layout.tsx` con contexto y tres triggers. Evita ids duplicados y tres formularios en el DOM.
- **Sí:** extraer `ModalDialog` y que `FormDialog` lo envuelva conservando su API. Es el mecanismo menos costoso para no duplicar la trampa de Tab ni el reset.
- **No:** tres instancias independientes del modal. Duplicaría estado, ids y `<form>`.
- **Sí:** "Toda la sala" es excluyente y expande a los 8 ids al resolver, sin guardarlos. Cumple el pedido: internamente todo, visualmente un solo chip.
- **Sí:** tocar un niño con la sala activa sale del modo sala y deja solo ese niño. Es el gesto menos sorprendente sin guardar una selección previa.
- **Sí:** los 8 niños salen de `_data/children.ts`, no de los 3 del mockup. Es la app real y evita datos duplicados.
- **Sí:** TIPO sin default y obligatorio. Publicar un tipo que el usuario no eligió es peor que un error.
- **Sí:** activo sólido / inactivo pastel, como muestra el mockup (Comida sólido, el resto pastel).
- **Sí:** header fiel al mockup (Cancelar / título / Publicar) con "Cancelar" como `<button>` que cierra. Se prioriza la fidelidad visual sobre el patrón de X de SPEC 04/05.
- **Sí:** selector de fotos real con previews y máximo 4. Sin previews la sección queda muerta y no se puede validar nada.
- **Sí:** límite de 600 con contador y **sin** `maxLength` nativo. El contador en rojo comunica mejor que un input que ignora teclas, y mantiene alcanzable el mensaje de máximo.
- **Sí:** `10–600` caracteres. Un mínimo de 10 evita publicaciones vacías disfrazadas y no molesta anuncios cortos.
- **No:** reglas cruzadas ("Foto exige foto", "Anuncio exige sala"). Suman casos difíciles de descubrir y no estaban en el pedido.
- **No:** reutilizar `PostKind` para los 7 tipos. `PostKind` describe los 3 badges del feed; mezclarlos obligaría a tocar el feed y los datos de hoy.
- **No:** `FormData` para validar. Audiencia y tipo son grupos de radios/checkboxes con lógica de exclusión; el estado controlado es más simple y confiable.
- **No:** persistencia o borrador. Igual que SPEC 04/05: cerrar descarta.
- **Sí:** `<img>` nativo para las previews `blob:`. `next/image` no las optimiza y `unoptimized` igual deja la regla de ESLint en warning.
- **Sí:** agregar la talla `xs` a `ChildAvatar` en vez de repetir el mapa de tonos en el formulario.

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Regresión en los modales de niño y padre al extraer `ModalDialog` | `FormDialog` conserva sus props y `useFormDialogClose`; el paso 1 del plan los prueba antes de tocar el feed. |
| Fugas de memoria por `URL.createObjectURL` | `revokeObjectURL` al quitar y cleanup de desmontaje; el cierre remonta el formulario, lo que dispara el cleanup. |
| El estado de fotos sobrevive al cierre y rompe el reset | El provider remonta `PostForm` con una `key` de sesión en cada `close`, además del `form.reset()` de `ModalDialog`. |
| El header móvil y el composer están visibles a la vez y podrían abrir dos diálogos | Un solo `<dialog>`; ambos triggers llaman al mismo contexto. |
| 8 chips + fotos no entran en 390×600 | La tarjeta limita la altura y scrollea por dentro; los chips hacen wrap. |
| El azulejo "Agregar" no es alcanzable con teclado | El input es `sr-only` pero focusable y el azulejo es su `<label>` con `peer-focus-visible`. |
| Tailwind no genera las clases de los tipos por estar en un `.ts` | Son strings literales en `_data/post-composer.ts`; Tailwind 4 escanea todo el proyecto. |
| El modal abre enfocando un checkbox invisible | Es intencional (primer destinatario) y el anillo se pinta en el chip vía `peer-focus-visible`. |

## What is **not** in this spec

- Guardar la publicación, mostrarla en el feed o editar posts existentes.
- Subida real de imágenes o cualquier llamada de red.
- Los 7 tipos en `PostKind` o en los badges del feed.
- Borradores, toasts, estados de carga y de éxito.
- Destinatarios que no sean niños de la sala o "Toda la sala".
- Edición desde los enlaces "Editar" de cada publicación.
