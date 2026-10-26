# SPEC 04 — Modal para agregar y editar niño

> **Status:** Inplementado
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

- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npx eslint app` sin errores.
- [x] La consola del navegador no muestra errores ni warnings de React en `/ninos` ni en un perfil con el modal abierto y cerrado.
- [x] `app/` no importa nada de `references/`.
- [x] `grep -rln '"use client"' app/` devuelve exactamente cuatro archivos: `app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx` y `child-form-dialog.tsx`. Los tres primeros son preexistentes (SPEC 02 y 03); `child-form-dialog.tsx` es el único client component nuevo.
- [x] En `/ninos`, "Agregar niño" es un `<button type="button">` (no un `<a>`) y no modifica la URL al hacer clic.
- [x] Al hacer clic se abre un `<dialog>` abierto (`dialog.open === true`) por encima del contenido, con el `<h2>` "Agregar niño" y `aria-labelledby="child-form-title"`.
- [x] El modal muestra los cinco labels literales: `NOMBRE COMPLETO`, `FECHA DE NACIMIENTO`, `SALA`, `ALERGIAS (ETIQUETAS)`, `NOTAS MÉDICAS`.
- [x] Los placeholders son literales: "Ej. Martina López", "dd/mm/aaaa", "Ej. Maní, Lactosa", "Indicaciones, medicación, contactos…".
- [x] `#child-name` tiene el foco al abrir el modal.
- [x] "SALA" es un `<select>` real con exactamente un `<option>` cuyo texto es "Soles" y `value="soles"`; el chevron es decorativo (`aria-hidden="true"`).
- [x] Medidas verificadas por computed style: tarjeta `max-width 520px`, radio `24px`, fondo `rgb(251,244,236)`, borde `1px rgb(236,224,208)`; input radio `14px`, borde `1.5px` con color `rgb(234,223,208)`, fondo blanco, `font-size 15px`, `padding 13px 16px`; label `12px`, `font-weight 800`, `letter-spacing .7px`, `rgb(148,135,123)`. Chromium reporta `1px` en `border-width` por redondeo de layout: el mockup renderizado en el mismo navegador mide exactamente igual.
- [x] "Guardar" se pinta `rgb(217,88,60)` 800 15px y "Cancelar" `rgb(148,135,123)` 700 15px.
- [x] Escape cierra el modal y el foco vuelve al botón que lo abrió (`document.activeElement` es el disparador).
- [x] Clic en el scrim (fuera de la tarjeta) cierra el modal; clic dentro de la tarjeta no lo cierra.
- [x] "Cancelar" cierra el modal y la URL permanece en `/ninos`.
- [x] "Guardar" cierra el modal, la URL permanece en `/ninos` y el listado sigue mostrando exactamente las mismas 8 tarjetas, en el mismo orden.
- [x] Reabrir en modo alta después de tipear muestra los campos vacíos y el select en "Soles" (reset al cerrar).
- [x] Tab cicla dentro del modal: desde el último control vuelve al primero sin salir a la página (foco atrapado nativo).
- [x] Con el modal abierto, los controles del fondo no reciben clic ni foco (el `<dialog>` modal deja el resto inerte) y la sidebar conserva Niños con `aria-current="page"`.
- [x] En `/ninos/mateo-fernandez`, "Editar" es un `<button>` y abre el modal con el título "Editar niño".
- [x] El modal de edición de Mateo precarga: nombre "Mateo Fernández", fecha "12/03/2022", sala "Soles", alergias "MANÍ" y notas "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.".
- [x] El modal de edición de Sofía (`/ninos/sofia-mendez`) deja alergias y notas vacías y el resto precargado.
- [x] Guardar en modo edición no modifica el perfil: sigue mostrando "12 mar 2022", "3 años · Sala Soles" y la misma nota.
- [x] `birthDateInput` existe en los 8 niños y coincide día/mes/año con `birthDateLabel` según la tabla del data model.
- [x] A 390×600 la tarjeta deja 16px de margen, su contenido scrollea, la fila fecha/sala está apilada y `documentElement.scrollWidth` no supera `innerWidth`.
- [x] `/ninos` sigue siendo un server component y `/ninos/agregar` sigue respondiendo 404 (no se creó ruta nueva).
- [x] El título del modal se renderiza en Fredoka y labels, inputs y campos en Nunito.
- [x] Capturas en `.playwright-mcp/add-child-modal-1440.png`, `.playwright-mcp/add-child-modal-390.png` y `.playwright-mcp/mock-agregar-nino-1440.png`, comparadas contra el render del mockup: sin diferencias de layout, color ni tipografía en la tarjeta.
- [x] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

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

## Verification report

**Fecha:** 2026-10-26 · **Branch:** `spec-04-agregar-nino-modal` · **Commit verificado:** `da2c70b "04-agregar-nino-modal"` · **Agente:** `spec-verifier`

Punto de partida: `git status --short` vacío y `git branch --show-current` = `spec-04-agregar-nino-modal` (la implementación ya estaba commiteada por el usuario). **No se modificó ningún archivo de código ni de configuración en esta corrida**: los 32 criterios pasaron con el código existente. Los únicos cambios son las 32 casillas y esta sección.

Para el build se detuvo el dev server leftover de la corrida de SPEC 02 (PID 26648 en `:3000`), porque Turbopack no comparte `.next` entre `build` y `dev`. Al cerrar la corrida se detuvieron los tres servidores levantados aquí (dev `:3000`, prod `:3210`, referencias `:8971`).

### Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `npm run build` | ✅ exit 0 · `✓ Generating static pages using 9 workers (16/16)` · rutas `/`, `/ninos` (○), `/ninos/[id]` (◐ PPR) y `ƒ Proxy (Middleware)`. Sin ruta nueva. |
| `npx tsc --noEmit` | ✅ exit 0, sin salida. |
| `npx eslint app` | ✅ exit 0, sin salida. (`npm run lint` no se usa como señal: falla por `references/pantallas/support.js`, preexistente.) |
| `Select-String '"use client"'` en `app/` | ✅ exactamente 4 archivos: `app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx`, `child-form-dialog.tsx`. |
| `Select-String 'references'` en `app/` | ✅ sin coincidencias. |
| `Select-String ': any\|as any\|@ts-ignore\|@ts-expect-error\|style=\{\{'` | ✅ sin coincidencias. |
| `Select-String '#[0-9a-fA-F]{3,8}'` en `.ts/.tsx` | ✅ sin coincidencias (los hex viven solo en `@theme` de `globals.css`). |
| `Select-String 'export const (dynamic\|revalidate\|fetchCache\|runtime\|dynamicParams\|maxDuration)'` | ✅ sin coincidencias. |
| `postcss.config.*` / `tailwind.config.*` | ✅ no existen. |
| script Node sobre `app/_data/children.ts` | ✅ `{"ok": 8, "errors": []}`: los 8 `birthDateInput` coinciden con su `birthDateLabel`. |
| `curl` dev `:3000` | ✅ `/ninos` 200 · `/ninos/mateo-fernandez` 200 · `/ninos/agregar` **404** · `/ninos/no-existe` 404. |
| `curl` prod `next start :3210` | ✅ `/ninos` 200 · `/ninos/mateo-fernandez` 200 · `/ninos/agregar` **404** · `/ninos/no-existe` 404. |

Versiones: Next.js 16.4.3, Tailwind CSS 4.3.3.

### Contraste Next.js (Context7 `/vercel/next.js` + docs vendorizadas 16.4.3)

- `node_modules/next/dist/docs/01-app/02-guides/server-and-client-boundary.md:168`: *"A rendered React element can cross the boundary because it is serializable data. Passing rendered output as `children` lets a Server Component nest inside a Client Component without importing the Server Component's code into the client graph."* → Es exactamente el patrón `ChildFormDialog` (client) + `ChildForm` (server) como `children`. Correcto.
- `docs/01-app/02-guides/migrating-to-cache-components.mdx` y `route-segment-config/dynamicParams.mdx`: *"Route segment config `dynamicParams` is not compatible with `nextConfig.cacheComponents`"* y *"dynamicParams is not available when Cache Components is enabled"* → el grep no encuentra ningún segment config en `app/`; la decisión del spec de no crear ruta nueva ni tocar `proxy.ts` está alineada.
- `use-client` / client boundaries: `child-form-dialog.tsx` declara la directiva como única entrada de cliente del archivo y no exporta nada que dependa de estado; no hay hooks de datos ni `fetch` en cliente. Correcto.
- Convenciones del repo verificadas: fuentes por `next/font/google` en `app/layout.tsx` (sin `<link>` a Google Fonts), Server Components por defecto, sin `dynamic`/`revalidate`/`fetchCache`/`runtime`, sin `postcss.config.*` ni `tailwind.config.*`.

### Criterios de aceptación (32/32 PASS)

Evidencia runtime: Playwright sobre dev `:3000`, viewport 1440×900 salvo donde se indique.

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `npm run build` sin errores | PASS | exit 0, 16/16 páginas, `ƒ Proxy (Middleware)` registrado. |
| 2 | `npx tsc --noEmit` sin errores | PASS | exit 0. |
| 3 | `npx eslint app` sin errores | PASS | exit 0. |
| 4 | Consola sin errores ni warnings con el modal abierto y cerrado | PASS | `browser_console_messages` tras abrir/cerrar en `/ninos` y en `/ninos/mateo-fernandez`: Errors 0, Warnings 0. |
| 5 | `app/` no importa `references/` | PASS | grep: sin coincidencias. |
| 6 | `"use client"` en exactamente 4 archivos | PASS | `app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx`, `child-form-dialog.tsx`. |
| 7 | "Agregar niño" es `<button type="button">` y no cambia la URL | PASS | `tagName BUTTON`, `type="button"`; tras el click `location.pathname === "/ninos"`. |
| 8 | Se abre `<dialog>` por encima con `<h2>` y `aria-labelledby` | PASS | `dialog.open === true`, `position: fixed`, `aria-labelledby="child-form-title"`, `h2#child-form-title` = "Agregar niño". |
| 9 | Cinco labels literales | PASS | `["NOMBRE COMPLETO","FECHA DE NACIMIENTO","SALA","ALERGIAS (ETIQUETAS)","NOTAS MÉDICAS"]`. |
| 10 | Placeholders literales | PASS | `["Ej. Martina López","dd/mm/aaaa","Ej. Maní, Lactosa","Indicaciones, medicación, contactos…"]`. |
| 11 | `#child-name` recibe el foco al abrir | PASS | `document.activeElement.id === "child-name"` inmediatamente después de `showModal()`. |
| 12 | `<select>` real con un option "Soles"/`soles` y chevron decorativo | PASS | `tagName SELECT`, `value="soles"`, `options ["Soles\|soles"]`, `appearance: none`; `svg` con `aria-hidden="true"`, 16px, a 16px del borde derecho. |
| 13 | Medidas por computed style | PASS | tarjeta `max-width 520px` (ancho real 520), radio `24px`, bg `rgb(251,244,236)`, borde `1px rgb(236,224,208)`, sombra `rgba(63,54,46,.35) 0 20px 50px -24px`; input radio `14px`, bg `rgb(255,255,255)`, `15px`, `padding 13px 16px`; label `12px`/800/`.7px`. Ver nota ① sobre el rojo-verde del hex y el `1.5px`. |
| 14 | Colores de Guardar y Cancelar | PASS | Guardar `rgb(217,88,60)` 800 15px; Cancelar `rgb(148,136,123)` 700 15px, `cursor: pointer`, ambos `type="submit"`. Ver nota ①. |
| 15 | Escape cierra y devuelve el foco al disparador | PASS | `open false` y `document.activeElement` = `<button>` con texto "Agregar niño". |
| 16 | Clic en el scrim cierra; clic dentro no | PASS | click en (1420,40) → `open false`; click en `#child-allergies` → `open true`. |
| 17 | Cancelar cierra y la URL sigue en `/ninos` | PASS | `open false`, `pathname "/ninos"`. |
| 18 | Guardar cierra sin tocar el listado | PASS | `open false`, `pathname "/ninos"`, y los 8 `href` posteriores son idénticos en orden a los previos (mateo, sofia, benjamin, valentina, tomas, emma, lucas, olivia). |
| 19 | Reabrir muestra campos vacíos y sala "Soles" | PASS | tras tipear en nombre/alergias/notas y cerrar con Escape, la reapertura da `name ""`, `allergies ""`, `notes ""`, `room "soles"`. |
| 20 | Tab cicla dentro del modal | PASS | Tab desde `#child-notes` → `BUTTON` "Cancelar"; Shift+Tab → vuelve a `#child-notes`. Ver nota ② sobre "nativo". |
| 21 | Fondo inerte y sidebar conserva `aria-current` | PASS | `click` sobre el link Feed → timeout (bloqueado); `link.focus()` programático no mueve el foco (`activeElement` sigue `INPUT#child-name`); `pathname "/ninos"` y `aria-current="page"` en "Niños". |
| 22 | "Editar" es `<button>` y abre el modal con título "Editar niño" | PASS | `tagName BUTTON`, `type="button"`, no existe ningún `<a>` con ese texto; `#child-form-title` = "Editar niño". |
| 23 | Mateo precarga los cinco campos | PASS | "Mateo Fernández", `12/03/2022`, sala `soles` (label "Soles"), alergias "MANÍ", notas "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.". |
| 24 | Sofía con alergias y notas vacías | PASS | nombre "Sofía Méndez", fecha `08/09/2023`, sala `soles`, `allergies ""`, `notes ""`. |
| 25 | Guardar en edición no modifica el perfil | PASS | tras editar el nombre a "NOMBRE FALSO EDITADO" y Guardar: `h1` sigue "Mateo Fernández", el `main` no contiene el nombre falso y conserva "12 mar 2022", "3 años · Sala Soles" y la nota; al reabrir, el input vuelve a "Mateo Fernández". |
| 26 | `birthDateInput` coherente en los 8 | PASS | script Node: `{"ok": 8, "errors": []}`. |
| 27 | 390×600 usable | PASS | `scrollWidth 380 ≤ innerWidth 390`; tarjeta `left 16`, ancho 348 (margen derecho 16 sobre el viewport de layout de 380), `top 16`, `max-height 568px`, `scrollHeight > clientHeight` (scrollea por dentro); fila fecha/sala `flex-direction: column` con SALA por debajo de FECHA. |
| 28 | `/ninos` server component y `/ninos/agregar` 404 | PASS | el grep de `"use client"` no incluye ninguna página; build marca `/ninos` como ○ estática; `curl` → 404 en dev **y** en prod, con `/ninos` y el perfil en 200 en ambos. |
| 29 | Fredoka en título, Nunito en campos | PASS | `#child-form-title` → `Fredoka…` (18px/600); label, input, select y botón → `Nunito…`; `document.fonts.check('600 18px Fredoka')` y `('400 15px Nunito')` → `true`. |
| 30 | Capturas comparadas contra el mockup | PASS | app a 1440: tarjeta `left 460`, `top 40`, ancho 520. Mock renderizado (servido en `127.0.0.1:8971`): `left 460`, `top 40`, ancho 520, radio 24px, bg `rgb(251,244,236)`, borde `1px rgb(236,224,208)`, sombra idéntica, input radio 14/`13px 16px`/15px/blanco, label 12px/800/`.7px`/`rgb(148,136,123)`, textarea `min-height 90px` `resize: vertical`. Cero diferencias de layout, color o tipografía en la tarjeta; ver nota ③ por los únicos dos deltas esperados. |
| 31 | Identificadores en inglés | PASS | auditoría de `child-form-dialog.tsx`, `child-form.tsx`, `child-form-field.tsx` y el campo nuevo: `dialogRef`, `openDialog`, `closeDialog`, `handleBackdropClick`, `handleKeyDown`, `FOCUSABLE_SELECTOR`, `ChildFormMode`, `FORM_TITLE`, `ROOM_OPTIONS`, `childFormDefaults`, `ChildFormField`, `ChildFormTextArea`, `ChildFormSelectOption`, `birthDateInput`. El español aparece solo en copy visible y en clases derivadas de tokens. |
| 32 | Sin `any`, `@ts-ignore`, `style={{}}` ni hex en JSX | PASS | los cuatro grep sobre `app/` devuelven 0 coincidencias; 0 hex en `.ts/.tsx`. |

### Notas de la corrida

① **Dos números del spec están mal convertidos, el código está bien.** El criterio 13 y el 14 piden `rgb(148,135,123)`, pero el token `--color-muted` es `#94887B` = `rgb(148,136,123)`, y el mockup renderizado en el mismo navegador mide exactamente `rgb(148,136,123)`. El valor implementado coincide con el diseño; el `135` es un error aritmético del spec. No lo cambié: requiere tu aprobación (ver "Propuestas de texto").

② **El wrap de Tab no es nativo.** En Chromium `document.activeElement` llegaba a `BODY` al tabular desde el último control: el `<dialog>` no atrapa el foco. Está resuelto con `handleKeyDown` en `child-form-dialog.tsx` (registrado en Decisions y Risks del spec). El comportamiento exigido por el criterio 20 se cumple; la aclaración "(foco atrapado nativo)" del criterio quedó desactualizada.

③ **Deltas visuales esperados contra el mockup**, ninguno es defecto: (a) el input "Nombre completo" se ve con borde coral porque recibe el foco al abrir (criterio 11); (b) detrás de la tarjeta hay scrim `oklab(...)/0.45` sobre la página de `/ninos`, mientras el mockup es una página suelta sin scrim.

④ **`border-[1.5px]` mide `1px`**: redondeo de layout de Chromium, comprobado con un div de prueba y con el propio mockup, que reporta el mismo `1px`. Ya está anotado en el criterio 13 y en Risks.

### Artefactos (en `.playwright-mcp/`, gitignored)

- `add-child-modal-1440.png` — `/ninos` con el modal de alta abierto (criterios 8-14, 30).
- `add-child-modal-390.png` — el mismo modal a 390×600 (criterio 27).
- `edit-child-modal-1440.png` — `/ninos/mateo-fernandez` en modo edición precargado (criterios 22-25).
- `mock-agregar-nino-1440.png` — render de `references/pantallas/agregar-nino.dc.html` servido en `127.0.0.1:8971` en modo lectura (criterio 30).

### Archivos modificados en esta corrida

- `specs/04-agregar-nino-modal.md`: 32 casillas marcadas + esta sección. Ningún archivo de `app/`, `proxy.ts`, `references/` o configuración fue tocado; `git status --short` al cerrar la corrida solo muestra este spec.

### Propuestas de texto (pendientes de tu aprobación)

1. Criterios 13 y 14: reemplazar `rgb(148,135,123)` por `rgb(148,136,123)` (= `#94887B`, el token `muted` y lo que mide el mockup).
2. Criterio 20: quitar el paréntesis "(foco atrapado nativo)" y dejar *"Tab cicla dentro del modal: desde el último control vuelve al primero y viceversa, sin que el foco salga a la página."*

### Pendientes y riesgos

- Nada funcional pendiente: 32/32 verificados con evidencia, sin correcciones de código.
- Las dos propuestas de texto de arriba quedan a tu criterio; no alteran el resultado.
- Con todo en PASS corresponde pasar `**Status:**` a `Implementado`, y commitear. Los dos los hacés vos: el workflow nunca cambia el estado ni commitea por su cuenta.
- Recordatorio de comportamiento ya documentado: Enter dentro de un campo dispara el submit implícito y cierra el modal (mismo efecto que Cancelar, sin persistencia).
- No quedó ningún servidor levantado: dev `:3000`, prod `:3210` y referencias `:8971` se detuvieron al cerrar la corrida. Para volver a ver la pantalla: `npm run dev`.

