# SPEC 04 — Modal para agregar y editar niño

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-26
> **Objective:** Implementar el formulario de `agregar-nino.dc.html` como modal sobre `/ninos` y reutilizarlo precargado desde el botón "Editar" de `/ninos/[id]`, sin alta ni persistencia.

## Por qué existe esta spec

- El mockup de alta es una tarjeta centrada, no una ruta: se resuelve como modal para no crear una URL nueva ni tocar `proxy.ts` (cuyo matcher `/ninos/:id` respondería 404 a `/ninos/agregar`).
- Es el primer modal del proyecto, así que fija el patrón de diálogo, foco y cierre que reutilizarán las specs siguientes.
- El perfil del niño ya enlazaba a este mockup desde "Editar"; esta spec convierte ese enlace muerto en el mismo formulario con datos precargados.

## Scope

**In:**

- `app/_components/children/child-form-dialog.tsx`: client component con el `<dialog>` nativo, el botón disparador, cierre por Escape/scrim y reset del formulario al cerrar.
- `app/_components/children/child-form.tsx`: tarjeta del formulario con `<form method="dialog">`, header (Cancelar / título / Guardar) y los cinco controles, en modos `create` y `edit`.
- `app/_components/children/child-form-field.tsx`: primitivas de campo `ChildFormField`, `ChildFormTextArea` y `ChildFormSelect` (label en mayúsculas + control).
- `app/_data/children.ts`: nuevo campo `birthDateInput` en `Child` y sus 8 valores en `dd/mm/aaaa`.
- `app/_components/icons.tsx`: agregar `ChevronDownIcon`.
- `app/globals.css`: token `--shadow-dialog`.
- `app/(app)/ninos/page.tsx`: el CTA "Agregar niño" pasa de `Link href="#"` a disparador del modal en modo `create`.
- `app/_components/children/child-profile-header.tsx`: el botón "Editar" pasa de `Link href="#"` a disparador del modal en modo `edit` con el niño precargado.
- Degradación: bajo `sm` la fila fecha/sala se apila, la tarjeta deja 16px de margen y su contenido scrollea si no entra.

**Out of scope (para specs futuras):**

- Alta, edición, borrado o persistencia real: "Guardar" solo cierra.
- Validación, campos obligatorios, mensajes de error, estados de carga y toasts.
- Componente de chips para alergias: el input es texto plano.
- Multi-sala: el `<select>` tiene una sola opción, `Soles`.
- Cambios en `proxy.ts`, `generateStaticParams` o el 404 de `/ninos/[id]`.
- Reutilizar el modal desde otras entidades (padres, publicaciones).

## Data model

Único cambio: un campo nuevo en `Child`, para no parsear copy al precargar el formulario.

```ts
// app/_data/children.ts
export type Child = {
  id: string;
  name: string;
  initial: string;
  tone: ChildTone;
  ageLabel: string;
  birthDateLabel: string; // copy para el perfil: "12 mar 2022"
  birthDateInput: string; // copy para el formulario: "12/03/2022"
  joinedAtLabel: string;
  allergies: { label: string; note: string }[];
  parents: Parent[];
};
```

Valores de `birthDateInput`, en orden del array:

| id                | birthDateLabel | birthDateInput |
| ----------------- | -------------- | -------------- |
| `mateo-fernandez` | 12 mar 2022    | `12/03/2022`   |
| `sofia-mendez`    | 08 sep 2023    | `08/09/2023`   |
| `benjamin-ruiz`   | 21 ene 2022    | `21/01/2022`   |
| `valentina-soto`  | 03 nov 2023    | `03/11/2023`   |
| `tomas-diaz`      | 17 may 2022    | `17/05/2022`   |
| `emma-castro`     | 29 jul 2023    | `29/07/2023`   |
| `lucas-romero`    | 14 abr 2022    | `14/04/2022`   |
| `olivia-vega`     | 02 oct 2023    | `02/10/2023`   |

Contratos de los componentes nuevos:

```ts
// child-form-dialog.tsx — "use client"
type ChildFormDialogProps = {
  triggerLabel: string;
  triggerClassName: string;
  triggerIcon?: ReactNode;
  children: ReactNode; // siempre un <ChildForm />
};

// child-form.tsx — server component
export type ChildFormMode = "create" | "edit";
type ChildFormProps = { mode: ChildFormMode; child?: Child };

// child-form-field.tsx — server components
ChildFormField:    { id; label } & InputHTMLAttributes<HTMLInputElement>
ChildFormTextArea: { id; label } & TextareaHTMLAttributes<HTMLTextAreaElement>
ChildFormSelect:   { id; label; defaultValue: string; options: { value: string; label: string }[] }
```

Convenciones:

- `child` es obligatorio en `edit` y se ignora en `create`; el formulario deriva sus valores con un helper local `childFormDefaults(child?)` y los aplica como `defaultValue` (inputs no controlados).
- Precarga en `edit`: `name` → `child.name`; fecha → `child.birthDateInput`; sala → `soles`; alergias → `child.allergies.map(({ label }) => label).join(", ")`; notas → `child.allergies[0]?.note ?? ""`.
- Título: `{ create: "Agregar niño", edit: "Editar niño" }`. El mockup solo tiene "Agregar niño"; se usa "Editar niño" al reutilizarlo (ver Decisions).
- Sin `useState`: el cierre lo resuelve `<form method="dialog">` del navegador.
- `name` de los controles: `name`, `birthDate`, `room`, `allergies`, `notes`.

## Tokens y medidas

Un token nuevo en `@theme` de `app/globals.css`; el resto se reutiliza:

| Token | Valor | Uso |
| ----- | ----- | --- |
| `--shadow-dialog` | `0 20px 50px -24px rgb(63 54 46 / 0.35)` | tarjeta del modal |

Tokens existentes reutilizados: `auth-bg` (#FBF4EC, fondo de la tarjeta), `border` (#ECE0D0), `auth-input-border` (#EADFD0), `muted`, `eyebrow`, `ink`, `photo-text` (#B0A290, chevron del select), `placeholder` (#B6A99B), `coral` (foco).

Medidas del modal:

- `<dialog>`: `m-0 h-dvh w-screen max-h-dvh max-w-none bg-transparent p-0`, `backdrop:bg-ink/45`.
- Overlay interno: `flex min-h-dvh items-start justify-center overflow-y-auto p-4 sm:px-6 sm:py-10`; cierra al click si `event.target === event.currentTarget`.
- Tarjeta: `w-full max-w-[520px]`, `bg-auth-bg`, borde `1px border`, radio `24px`, `shadow-dialog`, `overflow-hidden`, `max-h-[calc(100dvh-32px)] overflow-y-auto`.
- Header: flex between, `padding 20px 26px`, borde inferior `1px border`. Cancelar `15px/700 muted`; título `18px Fredoka 600 ink`; Guardar `15px/800 eyebrow`. Ambos `<button type="submit">` dentro del form, `cursor-pointer`.
- Cuerpo: `padding 24px 26px`. Label `12px/800`, `letter-spacing .7px`, `muted`, `margin-bottom 8px`.
- Input y select: `padding 13px 16px`, radio `14px`, borde `1.5px auth-input-border`, fondo blanco, `15px ink`, separación `18px`. `focus:border-coral`.
- Select: `appearance-none` + `ChevronDownIcon` 16px `photo-text` a `right 16px`, `font-bold`.
- Textarea: `min-height 90px`, `resize-y`, `line-height 1.5`.
- Fila fecha/sala: `flex gap-[14px]`, `margin-bottom 18px`; `flex-col` bajo `sm`.
- Foco visible en todos los controles y botones: `focus-visible:ring-2 ring-coral` (offset 2px en botones).

## Convenciones de código

Se mantienen las de SPEC 01–03: identificadores en inglés, copy en español, named exports, un componente principal por archivo, sin `any`, sin `style={{}}` ni hex en el JSX, server components por defecto.

Específicas de esta spec:

- **`"use client"` solo en `child-form-dialog.tsx`.** El formulario y las primitivas de campo son server components; se pasan como `children` desde `/ninos` y desde `child-profile-header.tsx`.
- **Sin estado ni efectos de datos.** El único imperativo es `dialogRef.current.showModal()/close()` y el foco inicial.
- **Foco inicial:** tras `showModal()`, enfocar `#child-name` con `querySelector`. Escape y el retorno de foco al disparador son comportamiento nativo de `<dialog>`.
- **Contrato de id:** el `<dialog>` declara `aria-labelledby="child-form-title"` y `ChildForm` renderiza `<h2 id="child-form-title">`. Hay un solo modal por página.
- **Reset al cerrar:** en el evento `close` del `<dialog>`, `dialogRef.current.querySelector("form")?.reset()`, para que al reabrir no queden valores tipeados.
- **El scrim no usa `::backdrop` custom en CSS**: se resuelve con la variante `backdrop:` de Tailwind 4, ya disponible en la versión instalada.
- **No se reutiliza `AuthField`.** Su padding (14px), sus tokens y su carpeta son de auth; duplicar el campo es más barato que acoplar las dos pantallas.

## Implementation plan

1. **Datos.** Agregar `birthDateInput` a `Child` y los 8 valores. Test: `npx tsc --noEmit` limpio.
2. **Token e icono.** Agregar `--shadow-dialog` a `@theme` y `ChevronDownIcon` a `icons.tsx`. Test: `npm run build` compila y `/ninos` no cambia.
3. **Primitivas de campo.** Crear `child-form-field.tsx` con `ChildFormField`, `ChildFormTextArea` y `ChildFormSelect`. Test: `npx tsc --noEmit` limpio.
4. **Formulario.** Crear `child-form.tsx` con `<form method="dialog">`, header, los cinco campos, `childFormDefaults` y los dos modos. Test: `npm run build`.
5. **Diálogo.** Crear `child-form-dialog.tsx` con `<dialog>`, el disparador, cierre por scrim/Escape, foco inicial y reset. Test: compila sin directivas extra.
6. **Alta en `/ninos`.** Reemplazar el `Link` del CTA por `<ChildFormDialog mode="create">` + `<ChildForm mode="create" />`. Test: clic abre, las 8 tarjetas siguen, la URL no cambia.
7. **Edición en el perfil.** Reemplazar el `Link` "Editar" de `child-profile-header.tsx` por el mismo diálogo en modo `edit`. Test: `/ninos/mateo-fernandez` precarga nombre, `12/03/2022`, `Soles`, `MANÍ` y la nota de alergia.
8. **Responsive y foco.** Apilar la fila fecha/sala bajo `sm`, limitar la altura de la tarjeta y verificar el anillo de foco. Test: a 390×600 el modal entra, scrollea y no hay scroll horizontal.

## Acceptance criteria

- [ ] `npm run build` termina sin errores.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx eslint app` sin errores.
- [ ] La consola del navegador no muestra errores ni warnings de React en `/ninos` ni en un perfil con el modal abierto y cerrado.
- [ ] `app/` no importa nada de `references/`.
- [ ] `grep -rln '"use client"' app/` devuelve exactamente cuatro archivos: `app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx` y `child-form-dialog.tsx`. Los tres primeros son preexistentes (SPEC 02 y 03); `child-form-dialog.tsx` es el único client component nuevo.
- [ ] En `/ninos`, "Agregar niño" es un `<button type="button">` (no un `<a>`) y no modifica la URL al hacer clic.
- [ ] Al hacer clic se abre un `<dialog>` abierto (`dialog.open === true`) por encima del contenido, con el `<h2>` "Agregar niño" y `aria-labelledby="child-form-title"`.
- [ ] El modal muestra los cinco labels literales: `NOMBRE COMPLETO`, `FECHA DE NACIMIENTO`, `SALA`, `ALERGIAS (ETIQUETAS)`, `NOTAS MÉDICAS`.
- [ ] Los placeholders son literales: "Ej. Martina López", "dd/mm/aaaa", "Ej. Maní, Lactosa", "Indicaciones, medicación, contactos…".
- [ ] `#child-name` tiene el foco al abrir el modal.
- [ ] "SALA" es un `<select>` real con exactamente un `<option>` cuyo texto es "Soles" y `value="soles"`; el chevron es decorativo (`aria-hidden="true"`).
- [ ] Medidas verificadas por computed style: tarjeta `max-width 520px`, radio `24px`, fondo `rgb(251,244,236)`, borde `1px rgb(236,224,208)`; input radio `14px`, borde `1.5px` con color `rgb(234,223,208)`, fondo blanco, `font-size 15px`, `padding 13px 16px`; label `12px`, `font-weight 800`, `letter-spacing .7px`, `rgb(148,135,123)`. Chromium reporta `1px` en `border-width` por redondeo de layout: el mockup renderizado en el mismo navegador mide exactamente igual.
- [ ] "Guardar" se pinta `rgb(217,88,60)` 800 15px y "Cancelar" `rgb(148,135,123)` 700 15px.
- [ ] Escape cierra el modal y el foco vuelve al botón que lo abrió (`document.activeElement` es el disparador).
- [ ] Clic en el scrim (fuera de la tarjeta) cierra el modal; clic dentro de la tarjeta no lo cierra.
- [ ] "Cancelar" cierra el modal y la URL permanece en `/ninos`.
- [ ] "Guardar" cierra el modal, la URL permanece en `/ninos` y el listado sigue mostrando exactamente las mismas 8 tarjetas, en el mismo orden.
- [ ] Reabrir en modo alta después de tipear muestra los campos vacíos y el select en "Soles" (reset al cerrar).
- [ ] Tab cicla dentro del modal: desde el último control vuelve al primero sin salir a la página (foco atrapado nativo).
- [ ] Con el modal abierto, los controles del fondo no reciben clic ni foco (el `<dialog>` modal deja el resto inerte) y la sidebar conserva Niños con `aria-current="page"`.
- [ ] En `/ninos/mateo-fernandez`, "Editar" es un `<button>` y abre el modal con el título "Editar niño".
- [ ] El modal de edición de Mateo precarga: nombre "Mateo Fernández", fecha "12/03/2022", sala "Soles", alergias "MANÍ" y notas "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.".
- [ ] El modal de edición de Sofía (`/ninos/sofia-mendez`) deja alergias y notas vacías y el resto precargado.
- [ ] Guardar en modo edición no modifica el perfil: sigue mostrando "12 mar 2022", "3 años · Sala Soles" y la misma nota.
- [ ] `birthDateInput` existe en los 8 niños y coincide día/mes/año con `birthDateLabel` según la tabla del data model.
- [ ] A 390×600 la tarjeta deja 16px de margen, su contenido scrollea, la fila fecha/sala está apilada y `documentElement.scrollWidth` no supera `innerWidth`.
- [ ] `/ninos` sigue siendo un server component y `/ninos/agregar` sigue respondiendo 404 (no se creó ruta nueva).
- [ ] El título del modal se renderiza en Fredoka y labels, inputs y campos en Nunito.
- [ ] Capturas en `.playwright-mcp/add-child-modal-1440.png`, `.playwright-mcp/add-child-modal-390.png` y `.playwright-mcp/mock-agregar-nino-1440.png`, comparadas contra el render del mockup: sin diferencias de layout, color ni tipografía en la tarjeta.
- [ ] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [ ] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

## Decisions

- **Sí:** modal sobre `/ninos` en lugar de ruta. El usuario lo pidió así y evita la colisión de `/ninos/agregar` con `[id]` y con el matcher de `proxy.ts`.
- **No:** `/agregar-nino` o `/ninos/agregar`. Ambas obligan a tocar `proxy.ts` y la URL no aporta nada si es un modal.
- **Sí:** `<dialog>` nativo con `showModal()`. Da Escape, capa superior y retorno de foco al disparador sin código propio; el ciclo de Tab se cierra a mano (20 líneas) porque Chromium deja escapar el foco al chrome del navegador.
- **No:** overlay con `useState` + `z-index`. Reimplementa lo que el navegador ya hace y suele dejar el foco fuera del modal.
- **No:** modal dirigido por `?agregar=1`. Obliga a leer `searchParams` y a otro `Suspense` bajo `cacheComponents` para un estado que no necesita URL.
- **Sí:** `<form method="dialog">`. Cancelar y Guardar cierran sin estado ni handlers; el formulario es no controlado.
- **No:** `useState` para abrir/cerrar. El único imperativo es `showModal()`/`close()` sobre el ref.
- **Sí:** composición `ChildFormDialog` (client, chrome) + `ChildForm` (server, tarjeta). Mantiene un solo archivo con directiva de cliente y todo el copy en el servidor.
- **Sí:** "Guardar" cierra sin alta ni modificación. Es interfaz pura; el estado real llega con la spec de backend.
- **Sí:** "Editar" reutiliza el modal con datos precargados. El mockup ya enlazaba el perfil a esta pantalla y el usuario lo aprobó.
- **Sí:** título "Editar niño" en modo edición. Un formulario titulado "Agregar niño" mientras se edita a Mateo sería engañoso; es el único copy desviado del mockup y queda registrado.
- **Sí:** `birthDateInput` como campo nuevo. Evita parsear "12 mar 2022" en runtime y mantiene las dos formas como copy explícito, igual que SPEC 02.
- **No:** `type="date"`. El formato visible dependería del locale y no coincide con "dd/mm/aaaa".
- **Sí:** `<select>` real con una sola opción. El usuario lo eligió; es accesible y no necesita JS, aunque hoy solo tenga "Soles".
- **Sí:** input de texto para alergias. Los chips son otra interacción y otro componente; el spec es de interfaz fija.
- **No:** reutilizar `AuthField`. Acoplaría el alta de niños a la pantalla de login por 10 líneas de markup.
- **Sí:** scrim con `backdrop:bg-ink/45` de Tailwind 4. Evita CSS a mano en `globals.css`.
- **Sí:** reset del form al cerrar. Sin persistencia, reabrir con los datos tipeados sugeriría un borrador que no existe.
- **Sí:** tarjeta alineada arriba con 40px, como el mockup, y no centrada verticalmente. Es la referencia visual que hay que respetar.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| `<dialog>` no bloquea el scroll del body, así que el fondo puede scrollear detrás del scrim | La tarjeta limita su alto a `calc(100dvh-32px)` y scrollea por dentro; si molesta, se agrega `overflow:hidden` en `body` al abrir en otra spec |
| Enter dentro de un campo hace submit implícito y cierra el modal como "Cancelar" | Sin persistencia el resultado es idéntico al de Guardar; comportamiento aceptado y documentado |
| `form.reset()` devuelve los `defaultValue`, no vacía en modo edición | Es lo esperado: al reabrir se vuelve a ver el niño real, no los cambios tipeados |
| Ids `child-*` repetidos si dos modales conviven en una página | Hoy hay un solo modal por ruta; el contrato de id está documentado y se revisa si se agrega un tercer punto de entrada |
| El select con una sola opción puede no desplegar lista en algunos navegadores | Sigue siendo focusable y con valor visible "Soles"; no hay segunda sala que elegir en el mockup |
| `backdrop:` de Tailwind depende de la versión instalada | Verificado en `node_modules/tailwindcss` 4.x; si fallara, 4 líneas de CSS en `globals.css` resuelven el scrim |
| Duplicar el campo de texto respecto de `AuthField` | Aceptado: 10 líneas repetidas frente a acoplar auth con niños; se unifican cuando exista un `_components/ui/` |
| Chromium no atrapa el foco dentro de `<dialog>`: Tab desde el último control llega al chrome del navegador | `child-form-dialog.tsx` intercepta Tab y Shift+Tab cuando el foco está en el primer o último control del modal y lo devuelve adentro |
| `border-[1.5px]` se mide como `1px` en Chromium | Es redondeo de layout del navegador, no del CSS: el mockup con `1.5px` reporta el mismo `1px`, así que la comparación visual no se ve afectada |

## What is **not** in this spec

- Alta, edición, borrado o persistencia real de niños.
- Validación, campos obligatorios, errores, loading o notificaciones.
- Chips de alergias y selector de múltiples salas.
- Reutilizar el modal para padres o publicaciones.
- Ruta `/agregar-nino`, `/ninos/agregar` o cambios en `proxy.ts`.
- Subida de fotos del niño.
- Tests automatizados más allá de la verificación manual con Playwright.
- Modo oscuro y rediseño mobile más allá de la degradación descrita.

Cada uno de esos, si llega, va en su propia spec.
