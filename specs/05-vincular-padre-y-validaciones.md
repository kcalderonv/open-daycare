# SPEC 05 — Modal para vincular padre y validaciones de formularios

> **Status:** Aprovado
> **Depends on:** SPEC 01, SPEC 02, SPEC 04
> **Date:** 2026-10-26
> **Objective:** Implementar `vincular-padre.dc.html` como modal sobre la tarjeta de padres de `/ninos/[id]` y agregar validación inline en ese formulario y en el de niño (alta y edición), generalizando el diálogo y las primitivas de campo a `_components/ui/`.

## Por qué existe esta spec

- El perfil del niño ya enlazaba a `vincular-padre.dc.html` desde "Vincular otro padre", igual que SPEC 04 con "Editar": hoy es un `Link href="#"`. Esta spec convierte ese enlace muerto en el modal real.
- SPEC 04 dejó la validación explícitamente fuera de alcance. Con dos formularios sobre la misma infraestructura, las reglas y el patrón de error se fijan una sola vez y se reutilizan.
- El segundo modal obliga a extraer `FormDialog` y las primitivas de campo a `_components/ui/`, que era el pendiente anotado en las decisiones de SPEC 04.
- `child-form-dialog.tsx` hardcodea `#child-name` y `aria-labelledby="child-form-title"`. Con dos modales en la misma página (`Editar` y `Vincular otro padre`) eso deja de ser sostenible.

## Scope

**In:**

- `app/_components/ui/form-dialog.tsx`: nuevo client component que reemplaza a `child-form-dialog.tsx`. `<dialog>` nativo con `showModal()`, cierre por Escape/scrim, trampa de Tab, reset del formulario al cerrar y contexto `useFormDialogClose()` para que el formulario cierre sin validar o tras validar.
- `app/_components/ui/form-field.tsx`: nuevo, reemplaza a `child-form-field.tsx`. `FormField`, `FormTextArea` y `FormSelect` con prop opcional `error` que pinta mensaje, `aria-invalid` y `aria-describedby`.
- `app/_components/children/parent-invite-form.tsx`: nuevo client component con el diseño completo de `vincular-padre.dc.html` (header con título/subtítulo/X, aviso azul, nombre, email, chips de parentesco, panel de código, CTA "Enviar invitación") y su validación.
- `app/_data/parent-invite.ts`: código de invitación, copy de vencimiento y opciones de parentesco.
- `app/_data/children.ts`: nuevo campo `firstName` en `Child` y sus 8 valores.
- `app/_components/children/child-form.tsx`: pasa a client component; conserva el diseño de SPEC 04 y suma reglas, errores inline y cierre explícito.
- `app/_components/children/child-parents-card.tsx`: recibe `child` en vez de `parents` y el link "Vincular otro padre" pasa a ser el disparador del modal.
- `app/_components/children/child-profile-header.tsx` y `app/(app)/ninos/page.tsx`: migran a la nueva API de `FormDialog`.
- `app/(app)/ninos/[id]/page.tsx`: pasa `child` a `ChildParentsCard`.
- `app/_components/icons.tsx`: agregar `InfoIcon`, `CloseIcon` y `SendIcon`.
- `app/globals.css`: 8 tokens nuevos (ver tabla).
- Eliminar `app/_components/children/child-form-dialog.tsx` y `app/_components/children/child-form-field.tsx` (su contenido se mueve a `ui/`).
- Degradación: la tarjeta de invitación usa `max-w-[480px]`, deja 16px de margen bajo `sm`, scrollea por dentro si no entra y los tres chips caben en una fila a 390px.

**Out of scope (para specs futuras):**

- Alta real del padre, envío de correo, generación o verificación del código, expiración real.
- Persistencia: "Enviar invitación" cierra y no modifica la tarjeta de padres.
- Cambios en `ParentRelationship`, `Parent` o el modelo de datos para soportar `guardian`.
- Detección de emails duplicados o cuentas existentes.
- Chips de alergias, selector de múltiples salas y cualquier rediseño del formulario de niño más allá de los errores.
- Rutas nuevas, cambios en `proxy.ts`, `generateStaticParams` o el 404 de `/ninos/[id]`.
- Toasts, estados de carga y estados de éxito posteriores al envío.

## Data model

Dos cambios de datos, ambos de copy explícito, sin persistencia.

```ts
// app/_data/children.ts
export type Child = {
  id: string;
  name: string;
  firstName: string; // copy para el aviso: "Mateo"
  initial: string;
  tone: ChildTone;
  ageLabel: string;
  birthDateLabel: string;
  birthDateInput: string;
  joinedAtLabel: string;
  allergies: { label: string; note: string }[];
  parents: Parent[];
};
```

| id                | name              | firstName |
| ----------------- | ----------------- | --------- |
| `mateo-fernandez` | Mateo Fernández   | `Mateo`   |
| `sofia-mendez`    | Sofía Méndez      | `Sofía`   |
| `benjamin-ruiz`   | Benjamín Ruiz     | `Benjamín`|
| `valentina-soto`  | Valentina Soto    | `Valentina`|
| `tomas-diaz`      | Tomás Díaz        | `Tomás`   |
| `emma-castro`     | Emma Castro       | `Emma`    |
| `lucas-romero`    | Lucas Romero      | `Lucas`   |
| `olivia-vega`     | Olivia Vega       | `Olivia`  |

```ts
// app/_data/parent-invite.ts
export const parentInvite = {
  code: "7K4P9",
  expiresLabel: "Vence en 7 días",
} as const;

export const relationshipOptions = [
  { value: "mother", label: "Mamá" },
  { value: "father", label: "Papá" },
  { value: "guardian", label: "Tutor/a" },
] as const;

export type ParentInviteRelationship =
  (typeof relationshipOptions)[number]["value"];

export const defaultRelationship: ParentInviteRelationship = "mother";
```

`ParentRelationship` (`"mother" | "father"`) **no cambia**: la tarjeta solo renderiza padres con relación madre/padre y `guardian` vive únicamente en el formulario.

Contratos de los componentes nuevos:

```ts
// app/_components/ui/form-field.tsx — sin directiva, consumido por client components
type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

type FormTextAreaProps = {
  id: string;
  label: string;
  error?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

type FormSelectProps = {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  error?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id">;
```

```ts
// app/_components/ui/form-dialog.tsx — "use client"
type FormDialogProps = {
  triggerContent: ReactNode; // contenido visual del disparador
  triggerClassName: string;
  titleId: string; // id del <h2> del formulario, para aria-labelledby
  initialFocusId: string; // id del control a enfocar al abrir
  children: ReactNode; // el formulario
};

export function FormDialog(props: FormDialogProps): ReactElement;
export function useFormDialogClose(): () => void; // lanza si se usa fuera del diálogo
```

```ts
// app/_components/children/parent-invite-form.tsx — "use client"
type ParentInviteFormProps = { child: Child };
```

Convenciones:

- `errors` es `Partial<Record<FieldName, string>>`; nunca `any`.
- Cada formulario declara su `FIELD_ORDER`, un array con el orden de foco de los campos.
- Los mensajes viven junto a la regla que los produce, en funciones puras que devuelven `string | undefined`.
- `child` es el único prop de datos del formulario de invitación; el nombre completo alimenta el subtítulo y `firstName` alimenta el aviso.

## Tokens y medidas

Ocho tokens nuevos en `@theme` de `app/globals.css`:

| Token                        | Valor     | Uso                                    |
| ---------------------------- | --------- | -------------------------------------- |
| `--color-error`              | `#c5503a` | texto y borde de los errores           |
| `--color-invite-blue`        | `#4e72c8` | icono del aviso y texto del chip activo |
| `--color-invite-info-bg`     | `#e3ecfb` | fondo del aviso                        |
| `--color-invite-info-fg`     | `#3f5694` | texto del aviso                        |
| `--color-invite-code-border` | `#e6d08a` | borde discontinuo del panel de código  |
| `--color-invite-code-label`  | `#a88526` | label y "Vence en 7 días"              |
| `--color-relationship-bg`    | `#ccd8f4` | fondo del chip activo                  |
| `--color-relationship-border`| `#9fb8ec` | borde del chip activo                  |

Tokens existentes reutilizados: `auth-bg` (#FBF4EC, tarjeta), `border` (#ECE0D0), `divider` (#F0E6D8, fondo del botón X), `muted` (#94887B), `muted-soft` (#A89A8B, subtítulo), `nav` (#6E6359, chip inactivo), `surface` (#FFFDF9, chip inactivo), `consent-bg` (#FBF1D6, panel de código), `consent-fg` (#8A7234, código), `cta-from`/`cta-to` (CTA), `shadow-auth-cta`, `shadow-dialog`, `auth-input-border`, `placeholder`, `ink`.

Medidas del modal de invitación (mockup a 1440, tarjeta medida en 480×…):

- `<dialog>`: `fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0`, `backdrop:bg-ink/45`.
- Overlay interno: `flex min-h-dvh items-start justify-center overflow-y-auto p-4 sm:px-6 sm:py-10`; cierra al click si `event.target === event.currentTarget`.
- Tarjeta: `w-full max-w-[480px]`, `max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog`.
- Header: `flex items-center justify-between gap-3 border-b border-border px-[26px] py-5`. Título `18px Fredoka 600 ink`; subtítulo `13px muted-soft`; botón X `34×34`, radio `10px`, fondo `divider`, icono 18px `muted`, `cursor-pointer`.
- Cuerpo: `padding 22px 26px`.
- Aviso: `flex gap-[11px] rounded-[14px] bg-invite-info-bg px-4 py-[13px] mb-5`; icono 20px `invite-blue`, `mt-px flex-none`; texto `13.5px invite-info-fg` con `line-height 1.45`.
- Label: `12px/800`, `letter-spacing .7px`, `muted`, `margin-bottom 8px` (PARENTESCO `10px`).
- Input: `padding 13px 16px`, radio `14px`, borde `1.5px auth-input-border`, fondo blanco, `15px ink`, separación `18px`. `focus:border-coral`.
- Chips: fila `flex gap-[9px] mb-5`; cada chip `flex-1`, `padding 11px`, radio `999px`, borde `1.5px`, `14px/800`, `text-center`. Inactivo `border-border bg-surface text-nav`; activo `border-relationship-border bg-relationship-bg text-invite-blue`.
- Panel de código: `rounded-2xl border-[1.5px] border-dashed border-invite-code-border bg-consent-bg px-[18px] py-[18px] text-center mb-5`. Label `12px/800` `.7px` `invite-code-label`; código `34px Fredoka 600`, `letter-spacing 7px`, `consent-fg`; nota `13px invite-code-label`, `margin-top 6px`.
- CTA: `flex w-full items-center justify-center gap-[9px] rounded-[14px] px-[14px] py-[14px]`, gradiente `180deg var(--color-cta-from) → var(--color-cta-to)`, `text-white 15.5px/800`, `shadow-auth-cta`, icono 19px.
- Foco visible: `focus-visible:ring-2 focus-visible:ring-coral` (offset 2px en botones, chips y CTA).

Del formulario de niño no cambian medidas ni tokens: solo se agrega, bajo el control, el mensaje de error `12.5px/700 text-error` con `margin-top 6px` y borde `error` en el control inválido.

## Reglas de validación

Ambos formularios usan `noValidate` y validación propia. Se conserva el atributo `required` en los campos obligatorios solo como semántica para lectores de pantalla; no dispara la validación nativa.

### Formulario de niño (`/ninos` y edición)

| Control                 | Regla                                              | Mensaje                                                  |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `#child-name`           | requerido tras `trim`                              | Ingresá el nombre completo.                              |
|                         | 2–60 caracteres                                    | El nombre debe tener al menos 2 caracteres. / El nombre no puede superar los 60 caracteres. |
|                         | `^[\p{L}\s'’-]+$`                                  | Usá solo letras y espacios en el nombre.                 |
| `#child-birth-date`     | requerido                                          | Ingresá la fecha de nacimiento.                          |
|                         | `^\d{2}/\d{2}/\d{4}$`                              | Usá el formato dd/mm/aaaa.                               |
|                         | fecha real de calendario y año ≥ 1900               | Ingresá una fecha válida.                                |
|                         | anterior o igual a hoy                             | La fecha de nacimiento no puede ser futura.              |
| `#child-allergies`      | opcional, ≤ 120 tras `trim`                        | Las alergias no pueden superar los 120 caracteres.       |
| `#child-notes`          | opcional, ≤ 500 tras `trim`                        | Las notas no pueden superar los 500 caracteres.          |
| `#child-room`           | sin regla: una sola opción                         | —                                                        |

### Formulario de invitación (`/ninos/[id]`)

| Control                | Regla                                              | Mensaje                                          |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `#parent-name`         | requerido tras `trim`                              | Ingresá el nombre completo.                      |
|                        | 2–60 caracteres                                    | El nombre debe tener al menos 2 caracteres. / El nombre no puede superar los 60 caracteres. |
|                        | `^[\p{L}\s'’-]+$`                                  | Usá solo letras y espacios en el nombre.         |
| `#parent-email`        | requerido                                          | Ingresá el email.                                |
|                        | `^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$`                  | Ingresá un email válido.                         |
| chips de parentesco    | siempre hay uno marcado (`mother` por defecto)     | —                                                |

### Momento de la validación

- **Al enviar:** se validan todos los campos en el orden de `FIELD_ORDER`. Si hay errores, `preventDefault` no hace falta (el formulario nunca navega), no se cierra el modal, se setean los errores y el foco va al primer control inválido.
- **Después del primer envío fallido:** cada campo que ya muestra error se revalida en `onChange` y el mensaje desaparece en cuanto el valor es válido. Los campos sin error no se validan mientras se tipea.
- **Al reabrir:** el `close` del diálogo hace `form.reset()` y cada formulario limpia `errors` en su `onReset`.
- **Cerrar sin validar:** el botón X del modal de invitación y "Cancelar" del modal de niño llaman a `useFormDialogClose()` y cierran con errores a la vista, sin validar. "Guardar" y "Enviar invitación" son `type="submit"`.
- **Enter:** el submit implícito valida igual que "Guardar"/"Enviar invitación" (cambia el comportamiento de SPEC 04, donde Enter cerraba como Cancelar).

## Convenciones de código

Se mantienen las de SPEC 01–04: identificadores en inglés, copy en español, named exports, un componente principal por archivo, sin `any`, sin `style={{}}` ni hex en el JSX, server components por defecto.

Específicas de esta spec:

- **`"use client"` solo en tres archivos nuevos:** `ui/form-dialog.tsx`, `children/parent-invite-form.tsx` y `children/child-form.tsx`. Total del proyecto: 6 archivos con la directiva.
- **`ui/form-field.tsx` no lleva directiva.** Solo renderiza markup y lo consumen client components; no necesita estado ni eventos propios.
- **El cierre viaja por contexto, no por `method="dialog"`.** `FormDialog` envuelve a `children` en un provider con `close()`; los formularios lo obtienen con `useFormDialogClose()`. Así el X y "Cancelar" cierran sin validar y el submit válido cierra explícitamente.
- **Reset centralizado.** `FormDialog` hace `form.reset()` en el evento `close`; los formularios solo limpian `errors` en `onReset`, sin `useEffect`.
- **Ids únicos por modal.** `child-form-title` / `child-name` / `child-*` para el niño; `parent-invite-title` / `parent-name` / `parent-email` para la invitación. Ambos diálogos conviven en `/ninos/[id]`.
- **`FormField` aplica `aria-invalid` y `aria-describedby` con el id del error** (`${id}-error`), y el `<p>` del mensaje lleva `role="alert"`. Si el caller pasa `aria-describedby` propio, se pierde: el contrato es el del campo.
- **Sin `maxLength`.** Un tope silencioso esconde el límite; el mensaje lo explica.
- **Sin `type="date"`.** El formato visible dependería del locale y no coincide con `dd/mm/aaaa` (misma decisión que SPEC 04).
- **Chips con `<input type="radio">` + `<label>`**, no `<button>`. El valor viaja en el formulario, el grupo es accesible por teclado y el estilo activo sale de `peer-checked:` sin estado extra.
- **No se reutiliza `AuthField`.** Sigue siendo de auth; los campos compartidos viven ahora en `ui/form-field.tsx`.

## Implementation plan

1. **Tokens e iconos.** Agregar los 8 tokens a `@theme` y `InfoIcon`, `CloseIcon` y `SendIcon` a `icons.tsx`. Test: `npm run build` compila y ninguna pantalla cambia.
2. **Primitivas de campo.** Crear `ui/form-field.tsx` con `FormField`, `FormTextArea`, `FormSelect` y la prop `error`; migrar los imports de `child-form.tsx`; borrar `children/child-form-field.tsx`. Test: `npx tsc --noEmit` limpio y el modal de niño se ve igual.
3. **Diálogo generalizado.** Crear `ui/form-dialog.tsx` con `triggerContent`, `titleId`, `initialFocusId` y `useFormDialogClose()`; migrar `ninos/page.tsx` y `child-profile-header.tsx`; borrar `children/child-form-dialog.tsx`. Test: abrir, cerrar con X/Escape/scrim, foco inicial y Tab siguen funcionando en los dos modales existentes.
4. **Datos.** Agregar `firstName` a `Child` y los 8 valores; crear `_data/parent-invite.ts`. Test: `npx tsc --noEmit` limpio y el perfil sigue mostrando el mismo nombre completo.
5. **Formulario de invitación.** Crear `parent-invite-form.tsx` con el markup completo del mockup, los chips, el panel de código y la validación. Test: `npm run build` y el componente no se usa todavía en ninguna página.
6. **Disparador en el perfil.** `child-parents-card.tsx` recibe `child` y monta `FormDialog` + `ParentInviteForm` en "Vincular otro padre"; `ninos/[id]/page.tsx` pasa `child`. Test: el modal abre desde `/ninos/mateo-fernandez`, muestra "a Mateo Fernández" y "Solo verá el feed de Mateo.", y la URL no cambia.
7. **Validación del niño.** `child-form.tsx` pasa a client component: `noValidate`, reglas, `errors`, `aria-invalid`, foco al primer inválido, revalidación por campo y reset. Test: enviar vacío bloquea y marca nombre y fecha; con datos válidos cierra y el listado no cambia.
8. **ARIA, responsive y comparación visual.** Verificar foco, Tab, scrim, 390×600 y computed styles; capturar las pantallas en `.playwright-mcp/` y comparar contra el mockup servido en local. Test: `npm run build`, `npx tsc --noEmit`, `npx eslint app` y consola sin errores.

## Acceptance criteria

- [x] `npm run build` termina sin errores y no registra rutas nuevas.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npx eslint app` sin errores.
- [x] La consola del navegador no muestra errores ni warnings de React en `/ninos` ni en `/ninos/mateo-fernandez` al abrir, enviar inválido y cerrar los dos modales.
- [x] `app/` no importa nada de `references/`.
- [x] `grep -rln '"use client"' app/` devuelve exactamente 6 archivos: `app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx`, `ui/form-dialog.tsx`, `children/child-form.tsx` y `children/parent-invite-form.tsx`; `ui/form-field.tsx` no aparece.
- [x] `app/_components/children/child-form-dialog.tsx` y `app/_components/children/child-form-field.tsx` no existen; `app/_components/ui/form-dialog.tsx` y `app/_components/ui/form-field.tsx` sí.
- [x] `FormDialog` se usa exactamente en tres lugares: `ninos/page.tsx`, `child-profile-header.tsx` y `child-parents-card.tsx`.
- [x] En `/ninos/mateo-fernandez`, "Vincular otro padre" es un `<button type="button">` cuyo nombre accesible contiene "Vincular otro padre" y no modifica la URL al hacer clic.
- [x] El clic abre un `<dialog>` con `open === true`, `aria-labelledby="parent-invite-title"`, el `<h2>` "Vincular padre" y el subtítulo "a Mateo Fernández".
- [x] El modal muestra los literales: "Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de Mateo.", `NOMBRE DEL PADRE/MADRE`, `EMAIL`, `PARENTESCO`, `CÓDIGO DE INVITACIÓN`, `Vence en 7 días` y "Enviar invitación".
- [x] Los placeholders son literales: "Ej. Diego Fernández" y "correo@ejemplo.com".
- [x] El código visible es "7K4P9", no es un `<input>` y no se puede editar.
- [x] `#parent-name` tiene el foco al abrir el modal.
- [x] PARENTESCO renderiza tres radios (`mother`/`father`/`guardian`) con labels "Mamá", "Papá" y "Tutor/a"; exactamente uno está marcado al abrir y el marcado es `mother`.
- [x] Al hacer clic en "Papá" queda un solo radio marcado (`father`) y "Mamá" deja de estarlo.
- [x] Enviar el formulario vacío no cierra el modal, muestra exactamente dos errores (nombre y email), ambos controles tienen `aria-invalid="true"` y el foco queda en `#parent-name`.
- [x] Enviar `diego@` en el email muestra "Ingresá un email válido.", mantiene el modal abierto y `aria-describedby` del input apunta al `<p role="alert">` del mensaje.
- [x] Un email válido como `diego.fernandez+test@example.com` no produce error de formato.
- [x] Con nombre "Diego Fernández" y email "correo@ejemplo.com", "Enviar invitación" cierra el modal, la URL sigue en `/ninos/mateo-fernandez` y la tarjeta de padres conserva exactamente las mismas filas y badges.
- [x] Al reabrir después de un envío válido, los campos están vacíos, el parentesco vuelve a "Mamá" y no queda ningún error visible.
- [x] El botón X cierra el modal con el formulario vacío y no muestra errores.
- [x] Escape cierra el modal y el foco vuelve al disparador "Vincular otro padre"; el clic en el scrim cierra y el clic dentro de la tarjeta no.
- [x] Tab cicla dentro del modal de invitación y dentro del de niño, sin que el foco salga a la página.
- [x] Medidas por computed style en el modal de invitación: tarjeta `max-width 480px`, radio `24px`, fondo `rgb(251,244,236)`, borde `1px rgb(236,224,208)`, sombra `0 20px 50px -24px rgba(63,54,46,.35)`.
- [x] Aviso: fondo `rgb(227,236,251)`, radio `14px`, padding `13px 16px`, texto `rgb(63,86,148)` 13.5px con `line-height 1.45`, icono 20px `rgb(78,114,200)`.
- [x] Chips: activo con fondo `rgb(204,216,244)`, borde `1.5px rgb(159,184,236)` y texto `rgb(78,114,200)`; inactivo con fondo `rgb(255,253,249)`, borde `rgb(236,224,208)` y texto `rgb(110,99,89)`; radio `999px` y padding `11px`.
- [x] Panel de código: fondo `rgb(251,241,214)`, borde discontinuo `1.5px rgb(230,208,138)`, radio `16px`, padding `18px`; código Fredoka 34px/600 con `letter-spacing 7px` y color `rgb(138,114,52)`; label y nota `rgb(168,133,38)`.
- [x] CTA: fondo con gradiente `rgb(244,151,126) → rgb(238,129,100)`, radio `14px`, padding `14px`, texto blanco `15.5px/800`, sombra `0 10px 22px -8px rgba(238,129,100,.7)` e icono de 19px.
- [x] Botón X: `34×34`, radio `10px`, fondo `rgb(240,230,216)`, icono `rgb(148,135,123)`.
- [x] Título y subtítulo en Fredoka y Nunito respectivamente (`document.fonts.check` para 600 18px Fredoka y 400 13px Nunito).
- [x] En `/ninos`, enviar el formulario de niño vacío no lo cierra, marca `#child-name` y `#child-birth-date` con `aria-invalid="true"` y enfoca `#child-name`; la sala no muestra error.
- [x] Nombre "A" → "El nombre debe tener al menos 2 caracteres."; "Mateo 123" → "Usá solo letras y espacios en el nombre.".
- [x] Fechas inválidas: "12-03-2022" → formato; "31/02/2023" → fecha válida; "01/01/2030" → no futura; "12/03/2022" no produce error.
- [x] 121 caracteres en alergias y 501 en notas producen sus mensajes de longitud; 120 y 500 no.
- [x] Corregir un campo con error hace desaparecer su mensaje sin volver a enviar; tipear en un campo sin error no muestra mensajes.
- [x] Enviar el formulario de niño con "Martina López" y "12/03/2022" cierra el modal y `/ninos` sigue mostrando las mismas 8 tarjetas en el mismo orden.
- [x] El modal de edición de Mateo precarga los cinco valores de SPEC 04 y valida igual que el alta; "Guardar" con fecha vacía no cierra y marca la fecha.
- [x] Cerrar el modal de niño después de un envío inválido y reabrirlo muestra los campos precargados/vacíos según el modo y sin errores.
- [x] `/ninos` y `/ninos/[id]` siguen siendo server components y `/ninos/agregar` sigue respondiendo 404.
- [x] A 390×600 los dos modales dejan 16px de margen, scrollean por dentro si no entran, los tres chips caben en una fila y `documentElement.scrollWidth` no supera `innerWidth`.
- [x] Capturas en `.playwright-mcp/parent-invite-1440.png`, `.playwright-mcp/parent-invite-390.png`, `.playwright-mcp/child-form-validation-1440.png` y `.playwright-mcp/mock-vincular-padre-1440.png`, comparadas contra el render del mockup: sin diferencias de layout, color ni tipografía en la tarjeta.
- [x] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

## Decisions

- **Sí:** mensajes de error propios, inline y en español, en lugar de la validación nativa del navegador. El globo nativo no se puede estilar, no se puede testear y su idioma depende del navegador.
- **Sí:** `noValidate` en ambos formularios, con `required` solo como semántica. Toda regla vive en las tablas de validación.
- **Sí:** validar al enviar y revalidar solo los campos que ya muestran error. Evita el ruido de marcar en rojo mientras el usuario todavía está escribiendo el primer valor.
- **Sí:** foco automático en el primer control inválido. Con dos formularios largos, el scroll manual para encontrar el error es peor que mover el foco.
- **Sí:** "Enviar invitación" cierra sin persistir. Es la misma decisión que SPEC 04: la interfaz no inventa altas ni cambios de estado que no sobreviven a un refresh.
- **No:** agregar el padre como PENDIENTE a la tarjeta en memoria. Mostraría un padre que desaparece al recargar y obligaría a mover estado a la tarjeta, que hoy es server component.
- **Sí:** chrome exacto del mockup para este modal (tarjeta de 480px, título + subtítulo + X, CTA al pie de 15.5px). El usuario pidió el diseño tal cual; se acepta que conviva con el chrome Cancelar/Guardar del modal de niño.
- **No:** unificar los dos chromes en un solo patrón. Unificarlos obliga a inventar copy que el mockup no tiene.
- **Sí:** chips con radios reales debajo del `<label>`. Da valor de formulario, navegación por flechas y estado marcado sin `useState`.
- **Sí:** `guardian` solo en `ParentInviteRelationship` del formulario. Tiparlo en `ParentRelationship` sin persistencia sería código muerto y forzaría a tocar `PARENT_STATUS_COPY`.
- **Sí:** código fijo `7K4P9` en `_data/parent-invite.ts`, igual que `invite.invitationCode` de SPEC 03. El mockup lo fija y no hay backend que lo genere.
- **Sí:** `firstName` explícito en `Child` en vez de `child.name.split(" ")[0]`. El aviso necesita "Mateo", no "Mateo Fernández", y el repo ya usa copy explícito (`ageLabel`, `birthDateLabel`, `birthDateInput`) para no parsear nombres en runtime.
- **Sí:** `FormDialog` con contexto `useFormDialogClose()` en vez de `<form method="dialog">`. La validación obliga a interceptar el submit; el contexto deja que X y "Cancelar" cierren sin validar y que el envío válido cierre explícito.
- **Sí:** mover `child-form-field.tsx` a `ui/form-field.tsx`. El formulario de padres necesita los mismos campos y `_components/ui/` era el pendiente anotado en SPEC 04.
- **No:** duplicar el diálogo o los campos. Dos copias del foco, la trampa de Tab y el reset se desincronizan al primer cambio.
- **Sí:** `triggerContent` como ReactNode. El disparador de "Vincular otro padre" es una fila con avatar y texto, no un pill con icono; la API vieja (`triggerLabel` + `triggerIcon`) no lo representa.
- **Sí:** voseo en los mensajes ("Ingresá", "Usá"), como el resto del copy de producto ("Activá tu cuenta").
- **No:** `maxLength` en los inputs. El tope silencioso no explica el límite y hace inalcanzable el mensaje de longitud.
- **No:** detectar emails duplicados. `Parent` no tiene email y no hay backend contra el que comparar.
- **No:** `type="date"`. Mismo motivo que SPEC 04: el formato visible depende del locale.
- **Sí:** `role="alert"` en el `<p>` del error. El lector anuncia el mensaje en el momento de validar.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| `noValidate` desactiva la red de seguridad del navegador: si falta una regla, el valor inválido pasa | Las tablas de validación son la fuente de verdad y cada regla tiene al menos un criterio con caso inválido |
| Dos `<dialog>` conviven en `/ninos/[id]` y podrían compartir ids | Ids con prefijo por modal (`child-*` / `parent-*`) y `titleId` obligatorio en `FormDialog`; hay criterio de foco y de `aria-labelledby` para los dos |
| Mover `child-form-dialog.tsx` y `child-form-field.tsx` deja desactualizados los nombres de SPEC 04 | SPEC 04 queda como histórico; esta spec documenta el movimiento y la verificación usa los nombres nuevos |
| `useFormDialogClose()` usado fuera del diálogo revienta en runtime | Lanza un error explícito en desarrollo; los únicos dos consumidores son los formularios que `FormDialog` monta |
| Enter pasa de "cerrar como Cancelar" a "validar y cerrar si es válido" | Es el comportamiento deseado; queda registrado en las reglas y en `Decisions` |
| `initialFocusId` apunta a un id que no existe y el modal abre sin foco | El id se pasa explícito en los tres usos y hay criterio de foco para los dos modales |
| `form.reset()` restaura los `defaultValue`, no vacía en modo edición | Es lo esperado: al reabrir se ve el niño real, no los cambios tipeados (igual que SPEC 04) |
| La validación de email es permisiva y no verifica existencia real | Es interfaz: sin backend ni DNS, el formato atrapa los typos comunes; queda fuera de alcance la verificación |
| Los tres chips podrían desbordar a 390px | `flex-1` + `gap-[9px]` + `14px`, con criterio explícito a 390×600 |
| `\p{L}` exige el flag `u` y un runtime ES2018+ | `target` ES2017 solo afecta el downlevel de sintaxis, no las regex; Chromium y Node actuales lo soportan y el build lo compila |
| El modal de invitación no bloquea el scroll del body (heredado de SPEC 04) | La tarjeta limita su alto a `calc(100dvh-32px)` y scrollea por dentro; el overlay también scrollea |
| `firstName` nuevo puede desincronizarse del `name` | Son valores literales del mock, sin lógica que los derive; un criterio verifica los 8 pares |

## What is **not** in this spec

- Alta real del padre, envío de correo, generación o expiración del código.
- Persistencia de la invitación o del niño, y cualquier llamada a red.
- `guardian` como relación persistida o cambios en `ParentRelationship`, `Parent` y `PARENT_STATUS_COPY`.
- Detección de emails duplicados, cuentas existentes o rate limiting.
- Estados de éxito, toasts, spinners y manejo de errores de servidor.
- Rediseño del formulario de niño más allá de los errores inline.
- Chips de alergias y selector de múltiples salas.
- Rutas nuevas, cambios en `proxy.ts`, `generateStaticParams` o el 404 de `/ninos/[id]`.
- Tests automatizados más allá de la verificación manual con Playwright.
- Modo oscuro y rediseño mobile más allá de la degradación descrita.

Cada uno de esos, si llega, va en su propia spec.

## Verification report

**Fecha:** 2026-10-26 · **Branch:** `spec-05-vincular-padre-y-validaciones` · **Commit de partida:** `7704c67 "05-vincular-padre"` · **Agente:** `spec-verifier`

Punto de partida: `git status --short` vacío sobre `spec-05-vincular-padre-y-validaciones` (la implementación ya estaba commiteada). Al cerrar la corrida quedaron detenidos el dev de `:3000` (incluido un leftover de PID 15412 iniciado a las 11:16), el server de producción de `:3210` y el server de referencias de `:8971`.

### Correcciones aplicadas en esta corrida

El código no pasaba dos criterios. Ambos se corrigieron con el cambio mínimo y se reverificó después:

1. **`app/_components/ui/form-dialog.tsx` — reset determinista (criterios 21, 22, 39).** `form.reset()` estaba solo en el handler de `onClose`. Chromium encola el evento `close` del `<dialog>` como *element task* y puede dispararse **después** de reabrir: midiendo con un listener nativo se vio `reopened value=ANA` y recién luego `native close event fired`. Al reabrir tras un envío válido quedaban el nombre tipeado y el radio "Papá". Se agregó el reset en el mismo tick de `closeDialog()`, conservando `onClose` para Escape. Evidencia post-fix: `rightAfterX: open=false name=[] checked=mother`, `rightAfterValidSubmit: open=false name=[] checked=mother`, `reopenAfterValid: name=[] checked=mother alerts=0`, y por Escape `name=[] checked=mother alerts=0`.
2. **`app/_components/children/parent-invite-form.tsx` — radio del chip (criterio 27).** `rounded-full` de Tailwind 4 compila a `calc(infinity * 1px)` y el navegador reporta `3.35544e+07px`; el spec y el mockup fijan `999px`. Se cambió a `rounded-[999px]` y ahora mide `999px`, igual que el mockup.

### Comandos ejecutados (con el código final)

| Comando | Resultado |
| --- | --- |
| `npm run build` | ✅ exit 0 · `✓ Generating static pages using 9 workers (16/16)` · `/`, `/ninos` (○), `/ninos/[id]` (◐ PPR) y `ƒ Proxy (Middleware)`. Sin rutas nuevas. |
| `npx tsc --noEmit` | ✅ exit 0, sin salida. |
| `npx eslint app` | ✅ exit 0, sin salida. (`npm run lint` no se usa como señal: falla por `references/pantallas/support.js`, preexistente.) |
| `Select-String '"use client"'` en `app/` | ✅ 6 archivos: `app-sidebar-nav.tsx`, `consent-checkbox.tsx`, `children-search.tsx`, `ui/form-dialog.tsx`, `children/child-form.tsx`, `children/parent-invite-form.tsx`. `ui/form-field.tsx` no aparece. |
| `Select-String 'references'` en `app/` | ✅ 0 coincidencias. |
| `Select-String ': any\|as any\|<any>\|@ts-ignore\|@ts-expect-error\|style=\{\{'` | ✅ 0 coincidencias. |
| `Select-String '#[0-9a-fA-F]{3,8}'` en `.ts/.tsx` | ✅ 0 coincidencias. |
| `Select-String 'export const (dynamic\|revalidate\|fetchCache\|runtime\|dynamicParams\|maxDuration)'` | ✅ 0 coincidencias. |
| `<FormDialog` en `app/**/*.tsx` | ✅ exactamente 3 usos: `ninos/page.tsx`, `child-profile-header.tsx`, `child-parents-card.tsx`. |
| `Test-Path` archivos movidos | ✅ `children/child-form-dialog.tsx` y `children/child-form-field.tsx` GONE; `ui/form-dialog.tsx` y `ui/form-field.tsx` EXISTS. |
| `postcss.config.*` / `tailwind.config.*` | ✅ ninguno existe; Tailwind sigue por `@tailwindcss/turbopack` en `next.config.ts`. |
| regex sobre `app/_data/children.ts` | ✅ 8 pares `name`/`firstName`, los 8 con `firstName` = primera palabra del nombre; `ParentRelationship` sigue `"mother" \| "father"` y `guardian` no aparece en los datos. |
| `curl` dev `:3000` | ✅ `/ninos` 200 · `/ninos/mateo-fernandez` 200 · `/ninos/agregar` **404** · `/ninos/no-existe` 404. |
| `curl` prod `next start :3210` | ✅ `/ninos` 200 · `/ninos/mateo-fernandez` 200 · `/ninos/agregar` **404** · `/ninos/no-existe` 404. |

Versiones: Next.js 16.4.3, React 19.3, Tailwind CSS 4.

### Contraste Next.js (Context7 `/vercel/next.js` + docs vendorizadas 16.4.3)

- **Cierre por contexto, no por props de función.** `node_modules/next/dist/docs/01-app/02-guides/server-and-client-boundary.md:160`: *"Data crosses through props, and it must be serializable, so functions like event handlers cannot cross"*, y `use-client.mdx`: *"function props ... cannot be passed from Server Components to Client Components"*. Por eso `useFormDialogClose()` vive en un provider de `FormDialog` y ningún page pasa un callback. Correcto.
- **`children` server renderizado dentro de un client component.** `server-and-client-boundary.md:168` y `:198`: el `Modal` recibe `title` y `children` como elementos serializados. Es el patrón `<FormDialog><ChildForm/></FormDialog>` y `<FormDialog triggerContent={...}><ParentInviteForm child={child}/></FormDialog>`, con `child` como dato plano serializable. Correcto.
- **Sin route segment configs.** `migrating-to-cache-components.mdx`: con `cacheComponents` activo, exportar `dynamic`, `revalidate`, `fetchCache`, `runtime` o `dynamicParams` es error de build. El grep devuelve 0 coincidencias y el build marca `/ninos/[id]` como ◐ PPR con `<Suspense>` + `params.then()`, intacto desde SPEC 02. Correcto.
- **Convenciones del repo:** fuentes por `next/font/google` en `app/layout.tsx` (0 coincidencias de `fonts.googleapis` en `app/`), server components por defecto, `"use client"` acotado a los 6 archivos.

### Criterios de aceptación (44/44 PASS)

Evidencia runtime: Playwright sobre dev `:3000`, viewport 1440×900 salvo donde se indique. El mockup de referencia se sirvió en `127.0.0.1:8971` y se midió en el mismo navegador.

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `npm run build` sin errores y sin rutas nuevas | PASS | exit 0, 16/16, mismas 6 entradas de ruta que SPEC 04. |
| 2 | `npx tsc --noEmit` sin errores | PASS | exit 0. |
| 3 | `npx eslint app` sin errores | PASS | exit 0. |
| 4 | Consola sin errores ni warnings con los dos modales abiertos, envío inválido y cierre | PASS | `/ninos` y `/ninos/mateo-fernandez`: `Total messages: 4 (Errors: 0, Warnings: 0)` y `Total messages: 2 (Errors: 0, Warnings: 0)` tras abrir + submit inválido + Escape. |
| 5 | `app/` no importa `references/` | PASS | grep: 0. |
| 6 | `"use client"` en exactamente 6 archivos | PASS | listado arriba; `ui/form-field.tsx` ausente. |
| 7 | Archivos viejos borrados, nuevos presentes | PASS | GONE/EXISTS arriba. |
| 8 | `FormDialog` en 3 lugares | PASS | grep `<FormDialog`: `ninos/page.tsx`, `child-profile-header.tsx`, `child-parents-card.tsx`. |
| 9 | "Vincular otro padre" es `<button type="button">` y no cambia la URL | PASS | `tag=BUTTON type=button name="Vincular otro padre"`, `urlBefore=urlAfter=/ninos/mateo-fernandez`. |
| 10 | Abre `<dialog>` con `aria-labelledby`, `<h2>` y subtítulo | PASS | `open=true`, `labelledBy=parent-invite-title`, `h2="Vincular padre"`, `subtitle="a Mateo Fernández"`. |
| 11 | Literales del copy | PASS | aviso completo "...Solo verá el feed de Mateo.", `NOMBRE DEL PADRE/MADRE`, `EMAIL`, `PARENTESCO` (legend), `CÓDIGO DE INVITACIÓN`, `Vence en 7 días`, `Enviar invitación`. |
| 12 | Placeholders literales | PASS | `["Ej. Diego Fernández","correo@ejemplo.com"]`. |
| 13 | Código "7K4P9" no editable | PASS | `tag=DIV`, `isContentEditable=false`, texto exacto. |
| 14 | `#parent-name` con foco al abrir | PASS | `focusOnOpen=parent-name`. |
| 15 | Tres radios con Mamá marcada y uno solo activo | PASS | `mother:true father:false guardian:false`, `checkedCount=1`, labels `["Mamá","Papá","Tutor/a"]`. |
| 16 | Clic en "Papá" deja un solo marcado | PASS | `checked=mother:false father:true guardian:false`. |
| 17 | Envío vacío: no cierra, 2 errores, `aria-invalid`, foco en nombre | PASS | `open=true`, `parent-name-error` + `parent-email-error`, `invalid=[true,true]`, `focus=parent-name`, `url=/ninos/mateo-fernandez`. |
| 18 | `diego@` muestra el error de email y `aria-describedby` apunta al `role=alert` | PASS | `open=true alert="Ingresá un email válido." describedBy=parent-email-error`, `alertId=parent-email-error`. |
| 19 | `diego.fernandez+test@example.com` no da error de formato | PASS | `open=false alerts=0` (el submit cerró). |
| 20 | Envío válido cierra, URL intacta, tarjeta de padres igual | PASS | `open=false url=/ninos/mateo-fernandez parentsSame=true`; firma "Lucía Fernández Mamá · activa ACTIVA Diego Fernández Papá · invitación enviada PENDIENTE Vincular otro padre" idéntica antes y después. |
| 21 | Reabrir tras envío válido: vacío, Mamá, sin errores | PASS | **requirió la corrección 1**. `reopenAfterValid: name=[] checked=mother alerts=0`. |
| 22 | X cierra con formulario vacío y sin errores | PASS | `rightAfterX: open=false name=[] checked=mother alerts=0`. |
| 23 | Escape cierra y devuelve el foco al disparador; scrim cierra; dentro no | PASS | `inviteEscape: open=false focus=BUTTON:Vincular otro padre`; `insideClick open=true`, `scrimClick open=false`. |
| 24 | Tab cicla dentro de los dos modales | PASS | Invitación: desde el CTA → `Cerrar`, Shift+Tab → `Enviar invitación`. Niño: desde `#child-notes` → `Cancelar`, Shift+Tab → `child-notes`. |
| 25 | Medidas de la tarjeta | PASS | `max-width 480px` (ancho real 480), radio `24px`, bg `rgb(251,244,236)`, borde `1px rgb(236,224,208)`, sombra `rgba(63,54,46,.35) 0 20px 50px -24px`; posición `left=480 top=40` igual que el mockup. |
| 26 | Aviso | PASS | bg `rgb(227,236,251)`, radio `14px`, padding `13px 16px`, texto `rgb(63,86,148)` `13.5px` con `line-height 19.575px` (=1.45), icono 20px `rgb(78,114,200)`; ancho 426px = mockup. |
| 27 | Chips | PASS | **requirió la corrección 2 (radio 999px)**. Activo `rgb(204,216,244)` / `rgb(159,184,236)` / `rgb(78,114,200)`; inactivo `rgb(255,253,249)` / `rgb(236,224,208)` / `rgb(110,99,89)`; `14px/800`, padding `11px`, radio `999px`, ancho 136px = mockup. Ver nota ① sobre el `1.5px`. |
| 28 | Panel de código | PASS | bg `rgb(251,241,214)`, `dashed rgb(230,208,138)`, radio `16px`, padding `18px`; código `Fredoka 34px/600`, `letter-spacing 7px`, `rgb(138,114,52)`; label `12px/800/.7px` y nota `13px` en `rgb(168,133,38)`. |
| 29 | CTA | PASS | `linear-gradient(rgb(244,151,126), rgb(238,129,100))`, radio `14px`, padding `14px`, blanco `15.5px/800`, sombra `rgba(238,129,100,.7) 0 10px 22px -8px`, icono `19px`, `gap 9px` — todos idénticos al mockup. |
| 30 | Botón X | PASS | `34×34`, radio `10px`, bg `rgb(240,230,216)`, icono 18px `rgb(148,136,123)`. Ver nota ②: el spec pide `148,135,123` pero `#94887B` es `148,136,123` y el mockup mide exactamente eso. |
| 31 | Fredoka en título, Nunito en campos | PASS | título `font-family Fredoka` 18px/600, subtítulo Nunito 13px; `document.fonts.check("600 18px Fredoka")` y `("400 13px Nunito")` → `true`. |
| 32 | Niño vacío: bloquea, marca nombre y fecha, sala sin error | PASS | `alerts=child-name-error + child-birth-date-error`, `nameInvalid=true dateInvalid=true roomInvalid=null`, `focus=child-name`, `open=true`. |
| 33 | "A" y "Mateo 123" | PASS | `"El nombre debe tener al menos 2 caracteres."` → `"Usá solo letras y espacios en el nombre."`. |
| 34 | Fechas | PASS | `12-03-2022`→"Usá el formato dd/mm/aaaa."; `31/02/2023`→"Ingresá una fecha válida."; `01/01/2030`→"La fecha de nacimiento no puede ser futura."; `12/03/2022`→`alerts=0`. |
| 35 | 121 y 501 pesan; 120 y 500 no | PASS | `child-allergies-error=Las alergias no pueden superar los 120 caracteres.` + `child-notes-error=...500...` con `open=true`; al bajar a 120/500 → `alerts=0`. |
| 36 | Corregir limpia sin reenviar; tipear en campos limpios no muestra nada | PASS | `C33c+fix` deja solo el error de fecha; `C36 typing-clean-fields alerts=0` antes del submit. |
| 37 | "Martina López" + "12/03/2022" cierra y el listado no cambia | PASS | `open=false url=/ninos cardsSame=true n=8`, orden mateo, sofia, benjamin, valentina, tomas, emma, lucas, olivia. |
| 38 | Edición precarga los cinco valores y valida igual | PASS | `h2="Editar niño" name="Mateo Fernández" date="12/03/2022" room=soles allergies="MANÍ" notes="Alergia al maní. Evitar..."`; con fecha vacía `open=true alerts="Ingresá la fecha de nacimiento." focus=child-birth-date`. |
| 39 | Reabrir tras envío inválido: precargado/vacío según modo, sin errores | PASS | **requirió la corrección 1**. `reopenEdit: date=12/03/2022 name=Mateo Fernández alerts=0`; `reopenCreate: name=[] room=soles alerts=0 focus=child-name`. |
| 40 | `/ninos` y `/ninos/[id]` server components y `/ninos/agregar` 404 | PASS | ningún page tiene `"use client"`; build marca `/ninos` ○ y `/ninos/[id]` ◐; `curl` → 404 en dev **y** prod, con el resto en 200. |
| 41 | 390×600 en los dos modales | PASS | Niño: `sw=380 iw=390 left=16 top=16 w=348 maxH=568px scroll=true`. Invitación: `sw=380 iw=390 left=16 top=16 w=348 maxH=568px scroll=true chipTops=431/431/431` (los tres chips en una fila, 89px c/u). En `child-form-390.png` se ve la fila fecha/sala apilada (SPEC 04 intacta). |
| 42 | Capturas comparadas contra el mockup | PASS | App vs mock renderido en `:8971`, mismo navegador: tarjeta `left=480 top=40 w=480`, aviso 426px, chips 136px, panel, código, CTA, X, input y label con los mismos computed styles. Cero diferencias de layout, color o tipografía en la tarjeta. Ver notas ① y ③. |
| 43 | Identificadores en inglés | PASS | Símbolos nuevos auditados: `FormDialog`, `FormDialogContext`, `useFormDialogClose`, `FormField`, `FormTextArea`, `FormSelect`, `controlClassName`, `describedBy`, `FieldError`, `ParentInviteForm`, `relationshipOptions`, `defaultRelationship`, `parentInvite`, `expiresLabel`, `FIELD_ORDER`, `VALIDATORS`, `validateName/Email/BirthDate/Allergies/Notes`, `InviteField`, `ChildField`, `ChildErrors`, `childFormDefaults`, `triggerContent`, `titleId`, `initialFocusId`, `firstName`, `InfoIcon`, `CloseIcon`, `SendIcon`. El español aparece solo en copy visible. |
| 44 | Sin `any`, `@ts-ignore`, `style={{}}` ni hex en JSX | PASS | los cuatro grep: 0 coincidencias; 0 hex en `.ts/.tsx`. |

### Notas de la corrida

① **`border-[1.5px]` se mide `1px`.** Los criterios 27 y 28 piden `1.5px`, pero `getComputedStyle().borderTopWidth` reporta `1px`: es redondeo de layout de Chromium, no del CSS. El mockup, que declara `border:1.5px solid ...`, mide `1px` en el mismo navegador (`chips.active.border = "1px solid rgb(159,184,236)"`, `panel.border = "1px dashed rgb(230,208,138)"`), así que app y referencia coinciden.

② **El `rgb(148,135,123)` del criterio 30 es un error aritmético del spec.** El token `--color-muted` es `#94887B` = `rgb(148,136,123)`; eso mide la app y eso mide el mockup renderizado. El código coincide con el diseño; el `135` no existe en ninguna parte.

③ **Un solo delta visual esperado contra el mockup:** el input "NOMBRE DEL PADRE/MADRE" se ve con borde de foco y detrás de la tarjeta hay scrim `oklab(...)/0.45` sobre el perfil, mientras el mockup es una página suelta. Ninguno es defecto.

④ **Aviso de dev-only sin impacto:** el log del dev server mostró `Fast Refresh had to perform a full reload when ./app/_components/ui/form-dialog.tsx changed` al editar el diálogo durante la corrida. Es una nota de Fast Refresh por cambiar el módulo que exporta el provider de contexto, no un error de la app; la consola del navegador quedó en 0 errores y 0 warnings.

### Artefactos (en `.playwright-mcp/`, gitignored)

- `parent-invite-1440.png` — modal de invitación limpio a 1440×900 (criterios 10–16, 25–31, 42).
- `parent-invite-validation-1440.png` — el mismo modal con los dos errores inline (criterios 17, 26 nota, 42).
- `parent-invite-390.png` — invitación a 390×600 con los tres chips en una fila (criterio 41).
- `child-form-validation-1440.png` — modal de niño con errores de nombre y fecha (criterios 32–39).
- `child-form-390.png` — modal de niño a 390×600 con la fila fecha/sala apilada (criterio 41).
- `mock-vincular-padre-1440.png` — render de `references/pantallas/vincular-padre.dc.html` servido en `127.0.0.1:8971` (criterio 42).

### Archivos modificados en esta corrida

- `app/_components/ui/form-dialog.tsx`: reset del formulario en el mismo tick del cierre programático.
- `app/_components/children/parent-invite-form.tsx`: `rounded-full` → `rounded-[999px]` en los chips.
- `specs/05-vincular-padre-y-validaciones.md`: 44 casillas marcadas + esta sección.

No se tocó `references/`, `proxy.ts`, `package.json`, configuración de lint ni de build. No se hizo commit ni push.

### Propuestas de texto (pendientes de tu aprobación)

1. **Criterio 30:** reemplazar `icono rgb(148,135,123)` por `icono rgb(148,136,123)` (= `#94887B`, el token `muted`, y lo que mide el mockup).
2. **Criterios 27 y 28:** aclarar el `1.5px` como hace SPEC 04, por ejemplo *"borde `1.5px` con color `rgb(159,184,236)`; Chromium reporta `1px` por redondeo de layout y el mockup mide igual"*.
3. **Risks, fila de `firstName`:** dice *"un criterio verifica los 8 pares"* pero no existe ese criterio en la lista. O se agrega el criterio (`firstName` coincide con la primera palabra de `name` en los 8 niños — verificado: 8/8) o se corrige la fila de riesgos.

### Pendientes y riesgos

- Nada funcional pendiente: 44/44 verificados con evidencia, tras dos correcciones.
- Comportamiento documentado que cambia SPEC 04: **Enter** en un campo valida y cierra solo si es válido (antes cerraba como Cancelar). Está en el spec y no requiere acción.
- Con todo en PASS corresponde pasar `**Status:**` a `Implementado` y commitear las dos correcciones junto con el spec. Los dos los hacés vos: el workflow nunca cambia el estado ni commitea por su cuenta.
- Para volver a ver la pantalla: `npm run dev`.
