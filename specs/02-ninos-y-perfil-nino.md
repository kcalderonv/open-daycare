# SPEC 02 — Niños y perfil del niño

> **Status:** Inplementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-25
> **Objective:** Implementar `/ninos` y `/ninos/[id]` como las pantallas `ninos.dc.html` y `perfil-nino.dc.html`, con datos mock locales, buscador en cliente y navegación real desde la sidebar.

## Por qué existe esta spec

- Es la primera vez que la app tiene más de una sección, así que obliga a decidir cómo se marca el ítem activo en la sidebar (hoy hardcodeada en "Feed").
- Introduce la primera ruta dinámica del proyecto, con datos que ya existen en el mockup pero no en el código.
- Reutiliza íntegro el shell de SPEC 01: estas dos pantallas no tocan `app/layout.tsx`.

## Scope

**In:**

- `app/ninos/page.tsx`: header "GESTIÓN / Niños", CTA "Agregar niño", buscador, contador, separador "SALA SOLES" y grid de 8 tarjetas.
- `app/ninos/[id]/page.tsx`: ruta dinámica con `generateStaticParams` para los 8 niños y `notFound()` para ids desconocidos.
- `app/_data/children.ts`: tipos `Child`, `Parent`, `ChildTone`, `ParentRelationship`, `ParentStatus`; los 8 registros; `getChild`, `getChildTag`, `parentsSummary`.
- `app/_components/children/child-avatar.tsx`: avatar de inicial en dos tamaños (`sm` 48px, `lg` 84px).
- `app/_components/children/child-card.tsx`: tarjeta del listado con tag o chevron.
- `app/_components/children/child-tag.tsx`: badge MANÍ / LACTOSA / VINCULAR.
- `app/_components/children/children-search.tsx`: client component con el input y el grid filtrado.
- `app/_components/children/child-profile-header.tsx`: avatar 84px, nombre, edad + sala y botón "Editar".
- `app/_components/children/child-allergy-note.tsx`: panel rojo de alergias y notas, condicional.
- `app/_components/children/child-info-table.tsx`: filas fecha de nacimiento / sala / ingreso.
- `app/_components/children/child-parents-card.tsx`: "PADRES VINCULADOS", filas y CTA "Vincular otro padre".
- `app/_components/app-sidebar-nav.tsx`: client component con `usePathname` para marcar Feed o Niños como activos.
- `app/_components/app-sidebar.tsx`: pasa a consumir `AppSidebarNav` en lugar de `NAV_ITEMS` con `active: true`.
- `app/_components/icons.tsx`: `SearchIcon`, `ChevronRightIcon`, `ChevronLeftIcon`, `AlertTriangleIcon`.
- `app/globals.css`: tokens de avatares de niño, avatares de padres, badges de tag/pendiente y panel de alergia.
- Degradación: grid de 1 columna bajo `sm`; en el perfil la columna de 300px pasa a ir debajo del contenido bajo `lg`.

**Out of scope (para specs futuras):**

- `/agregar-nino`, `/vincular-padre`, `/resumen-dia`: no se crean stubs.
- Alta, edición, borrado o vinculación real de niños y padres.
- Persistencia, API, base de datos o sesión.
- Subida de fotos de niño (la referencia solo usa iniciales).
- Tests automatizados del filtrado más allá de la verificación manual con Playwright.
- Diseño móvil completo con bottom nav.

## Data model

```ts
// app/_data/children.ts
export type ChildTone = "sky" | "rose" | "sage" | "sun" | "lilac";

export type ParentRelationship = "mother" | "father";
export type ParentStatus = "active" | "pending";

export type Parent = {
  id: string;
  name: string;
  relationship: ParentRelationship;
  status: ParentStatus;
};

export type Child = {
  id: string; // slug estable, usado por /ninos/[id]
  name: string;
  initial: string;
  tone: ChildTone;
  ageLabel: string; // copy: "3 años"
  birthDateLabel: string; // copy: "12 mar 2022"
  joinedAtLabel: string; // copy: "feb 2025"
  allergies: { label: string; note: string }[]; // [] = sin alergias
  parents: Parent[];
};

export type ChildTag = { kind: "allergy"; label: string } | { kind: "link-pending" };

export const children: Child[] = [/* los 8, en orden del mockup */];

export const room = { name: "Sala Soles", shortName: "Soles" } as const;

export function getChild(id: string): Child | undefined;
export function getChildTag(child: Child): ChildTag | null;
export function parentsSummary(count: number): string;
```

Datos fijos, literales del mockup. El orden del array es el orden del grid:

| # | id | Nombre | Inicial | Tono | Edad | Nacimiento | Ingreso | Alergia (label) | Padres |
| - | -- | ------ | ------- | ---- | ---- | ---------- | ------- | --------------- | ------ |
| 1 | `mateo-fernandez` | Mateo Fernández | M | sky | 3 años | 12 mar 2022 | feb 2025 | MANÍ | Lucía Fernández (mother, active), Diego Fernández (father, pending) |
| 2 | `sofia-mendez` | Sofía Méndez | S | rose | 2 años | 08 sep 2023 | mar 2025 | — | Camila Méndez (mother, active) |
| 3 | `benjamin-ruiz` | Benjamín Ruiz | B | sage | 3 años | 21 ene 2022 | feb 2025 | — | Paula Ruiz (mother, active), Andrés Ruiz (father, active) |
| 4 | `valentina-soto` | Valentina Soto | V | sun | 2 años | 03 nov 2023 | mar 2025 | — | — (vacío) |
| 5 | `tomas-diaz` | Tomás Díaz | T | lilac | 3 años | 17 may 2022 | feb 2025 | LACTOSA | Martín Díaz (father, active) |
| 6 | `emma-castro` | Emma Castro | E | rose | 2 años | 29 jul 2023 | mar 2025 | — | Julieta Castro (mother, active) |
| 7 | `lucas-romero` | Lucas Romero | L | sky | 3 años | 14 abr 2022 | feb 2025 | — | Nicolás Romero (father, active) |
| 8 | `olivia-vega` | Olivia Vega | O | sage | 2 años | 02 oct 2023 | mar 2025 | — | Renata Vega (mother, active) |

Notas de alergia (solo dos niños tienen):

- Mateo · `MANÍ`: "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila."
- Tomás · `LACTOSA`: "Intolerancia a la lactosa. Sin lácteos ni derivados."

Convenciones:

- `parentsSummary`: `0 → "sin padres vinculados"`, `1 → "1 padre vinculado"`, `n → "${n} padres vinculados"`.
- `getChildTag`: primera alergia → `{ kind: "allergy", label }`; si no hay alergias y `parents.length === 0` → `{ kind: "link-pending" }`; en cualquier otro caso `null` (la tarjeta dibuja el chevron). Esto reproduce exactamente el mockup: Mateo MANÍ, Tomás LACTOSA, Valentina VINCULAR, el resto chevron.
- Los avatares de padres no guardan color: `mother` usa lilá y `father` usa azul, siempre con texto blanco.
- Los textos de estado de padre se derivan con un mapa `Record<ParentRelationship, Record<ParentStatus, { meta: string; badge: string }>>`: `mother/active → "Mamá · activa" / "ACTIVA"`, `father/active → "Papá · activo" / "ACTIVO"`, `pending → "… · invitación enviada" / "PENDIENTE"`.
- Las fechas se guardan como copy ya formateado, igual que SPEC 01 guarda `time: "14:20"`. No hay matemática de fechas ni `Intl.DateTimeFormat`.
- Los datos de los 7 niños distintos de Mateo son mock de presentación: la referencia solo define su nombre, edad y cantidad de padres.
- `id` es el slug del nombre en kebab-case sin acentos. No hay ids numéricos.

## Tokens y medidas

Nuevos tokens en `@theme` de `app/globals.css` (los existentes de SPEC 01 se reutilizan tal cual):

| Token | Valor | Uso |
| ----- | ----- | --- |
| `--color-child-sky-bg` / `-fg` | `#A9D9E8` / `#1F7A93` | avatar sky |
| `--color-child-rose-bg` / `-fg` | `#F4B8CC` / `#C44A7A` | avatar rose |
| `--color-child-sage-bg` / `-fg` | `#B9DEC4` / `#3E8B62` | avatar sage |
| `--color-child-sun-bg` / `-fg` | `#F4DC8E` / `#9A7B1E` | avatar sun |
| `--color-child-lilac-bg` / `-fg` | `#C9B6E8` / `#7B5FC0` | avatar lilac |
| `--color-parent-lilac-bg` | `#C9B6E8` | avatar madre |
| `--color-parent-blue-bg` | `#A9C7E8` | avatar padre |
| `--color-tag-allergy-bg` / `-fg` | `#FBD8CC` / `#D9684A` | badge MANÍ, LACTOSA |
| `--color-tag-link-bg` / `-fg` | `#F9D2DE` / `#C56486` | badge VINCULAR |
| `--color-badge-pending-bg` / `-fg` | `#F7E7A6` / `#9A7B1E` | badge PENDIENTE |
| `--color-allergy-panel` | `#FBDAD6` | fondo del panel de alergia |
| `--color-allergy-icon-bg` | `#F4A8A0` | cuadro del icono |
| `--color-allergy-title` | `#C5413A` | "Alergias y notas" |
| `--color-allergy-body` | `#B25249` | texto de la nota |
| `--color-chevron` | `#CBB89F` | chevron de la tarjeta |
| `--color-avatar-empty-border` | `#D8CBBA` | círculo punteado "Vincular otro padre" |

Medidas de `/ninos`:

- Contenedor: `max-width 880px`, `padding 34px 40px 80px` (16px lateral en mobile).
- Header: eyebrow `12.5px` 800, `letter-spacing .8px`, color `eyebrow`; H1 `30px` Fredoka 600. CTA "Agregar niño" radio `14px`, `padding 11px 18px`, 800, gradiente `cta-from → cta-to`, `shadow-cta`.
- Buscador: surface, borde `1px border`, radio `14px`, `padding 12px 16px`, gap `11px`, input `15px` sin borde ni fondo, placeholder `#B6A99B`.
- Separador: "SALA SOLES" `12.5px` 800 + "8 niños" `13px` mute-soft + línea `1px separator` flexible.
- Grid: 2 columnas, gap `14px`; 1 columna bajo `sm`.
- Tarjeta: radio `18px`, `padding 16px`, gap `14px`, borde `1px border`, `shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)]`, hover borde `coral` + `translateY(-2px)` (`transition .15s`).
- Avatar `48px`, inicial Fredoka 600 `19px`. Nombre Fredoka 600 `16px`; meta `13px` mute-soft. Tag `11px` 800, `padding 5px 9px`, radio `999px`. Chevron `18px`.

Medidas de `/ninos/[id]`:

- Contenedor: `max-width 820px`, mismo padding.
- "Volver a Niños": `14px` 700 mute, gap `7px`, chevron `18px`, `margin-bottom 20px`.
- Dos columnas: contenido `flex: 1`, `min-width 300px`, gap `18px`; columna derecha `300px` fija, gap `14px`. Bajo `lg` se apila.
- Header de perfil: avatar `84px` (Fredoka 600 `34px`), H1 `28px` Fredoka 600, subtítulo `15px` mute (`"{ageLabel} · Sala Soles"`), botón "Editar" borde `1.5px border`, bg surface, texto nav, 700 `14px`, `padding 9px 16px`, radio `12px`.
- Panel de alergia: bg `allergy-panel`, radio `16px`, `padding 16px 18px`, gap `14px`; icono `40px` radio `11px` bg `allergy-icon-bg`; título `15px` 800 `allergy-title`; cuerpo `14.5px` `line-height 1.5` `allergy-body`.
- Tabla: surface, borde `1px`, radio `16px`, `overflow hidden`; filas `padding 15px 18px`, divisor `1px divider` salvo la última; label `14.5px` mute, valor `14.5px` 800 ink.
- CTA "Resumen del día": bg ink, blanco, radio `14px`, `padding 13px`, 800 `15px`, gap `9px`, ancho completo.
- Card de padres: surface, borde `1px`, radio `16px`, `padding 16px 18px`; label `12.5px` 800 `letter-spacing .8px` section-label; filas gap `14px`; avatar `40px` (Fredoka 600 `16px`, blanco); nombre `14.5px` 800; meta `12.5px` mute-soft; badge `10.5px` 800 `padding 4px 9px`.
- "Vincular otro padre": gap `12px`, `padding-top 8px`; círculo punteado `40px` borde `1.5px dashed avatar-empty-border`; texto `14.5px` 800 coral-link.

## Convenciones de código

Se mantienen las de SPEC 01: identificadores en inglés, copy en español, named exports, un componente principal por archivo, sin `any` ni `style={{}}` ni hex en el JSX, mapas tipados en lugar de condicionales encadenados, server components por defecto.

Específicas de esta spec:

- **`"use client"` solo en dos archivos**: `app-sidebar-nav.tsx` (usa `usePathname`) y `children-search.tsx` (usa `useState`). El resto son server components.
- **`app/ninos/page.tsx` solo compone**: header, `<ChildrenSearch items={children} />`. No filtra ni calcula estilos.
- **La lógica derivada vive en `_data/children.ts`**, no en el JSX: `getChildTag`, `parentsSummary`, `getChild`.
- **Mapas tipados**: `Record<ChildTone, string>` para avatar, `Record<ChildTag["kind"], string>` para tags, `Record<ParentRelationship, Record<ParentStatus, ...>>` para padres.
- **Ruta dinámica**: `generateStaticParams` devuelve `children.map(({ id }) => ({ id }))`; la página hace `await params` y `notFound()` si no existe. No se usan `dynamic`, `revalidate`, `fetchCache`, `runtime` ni `dynamicParams`.
- **Sin duplicar el shell**: las páginas no renderizan sidebar ni `AppShell`; ya lo hace `app/layout.tsx`.
- **Contador fijo**: "8 niños" usa `children.length`, no el resultado del filtro.
- **Búsqueda normalizada**: minúsculas + `normalize("NFD")` sin diacríticos + `trim`, para que "sofia" encuentre "Sofía".

## Implementation plan

1. **Datos.** Crear `app/_data/children.ts` con tipos, los 8 registros, `room`, `getChild`, `getChildTag` y `parentsSummary`. Test: `npx tsc --noEmit` limpio.
2. **Tokens e iconos.** Agregar los tokens a `@theme` en `app/globals.css` y los cuatro iconos a `icons.tsx`. Test: `npm run build` compila y `/` sigue igual.
3. **Perfil.** Crear `app/ninos/[id]/page.tsx` con `generateStaticParams`, `notFound()` y los cuatro subcomponentes de perfil. Test: `/ninos/mateo-fernandez` muestra el perfil completo y `/ninos/valentina-soto` sin panel de alergia y sin padres.
4. **Tarjeta y listado.** Crear `child-avatar.tsx`, `child-tag.tsx`, `child-card.tsx` y `app/ninos/page.tsx` con las 8 tarjetas enlazadas a `/ninos/[id]`. Test: `/ninos` muestra 8 tarjetas y cada una navega a su perfil.
5. **Buscador.** Crear `children-search.tsx` y montarlo en `/ninos`. Test: "sofia" deja 1 tarjeta, "zzz" muestra "No encontramos ningún niño con ese nombre." y el contador sigue en "8 niños".
6. **Navegación.** Crear `app-sidebar-nav.tsx` con `usePathname` y refactorizar `app-sidebar.tsx` para consumirlo. Test: `/` marca Feed activo, `/ninos` y `/ninos/mateo-fernandez` marcan Niños activo, y los clics navegan.
7. **Responsive.** Ajustar grid a 1 columna bajo `sm` y el perfil a una columna bajo `lg`. Test: a 390px no hay scroll horizontal y las dos pantallas se ven completas.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npx eslint app` sin errores.
- [x] La consola del navegador no muestra errores ni warnings de React en `/ninos` ni en un perfil.
- [x] `app/` no importa nada de `references/`.
- [x] `app/ninos/page.tsx` y `app/ninos/[id]/page.tsx` existen y son server components; solo `children-search.tsx` y `app-sidebar-nav.tsx` tienen `"use client"`.
- [x] `/ninos` muestra exactamente 8 tarjetas en el orden Mateo, Sofía, Benjamín, Valentina, Tomás, Emma, Lucas, Olivia.
- [x] Las tarjetas muestran la inicial y el color de avatar de la tabla (sky, rose, sage, sun, lilac según corresponda).
- [x] La meta de cada tarjeta dice exactamente `"{edad} · {padres}"`: Mateo "3 años · 2 padres vinculados", Sofía "2 años · 1 padre vinculado", Valentina "2 años · sin padres vinculados".
- [x] Solo Mateo (MANÍ), Valentina (VINCULAR) y Tomás (LACTOSA) muestran badge; las otras 5 muestran chevron.
- [x] El badge MANÍ usa `#FBD8CC`/`#D9684A`, LACTOSA el mismo par, VINCULAR `#F9D2DE`/`#C56486`.
- [x] El contador dice "8 niños" y no cambia al filtrar.
- [x] Escribir "sofia" en el buscador deja 1 tarjeta (Sofía Méndez); escribir "zzz" muestra "No encontramos ningún niño con ese nombre." y ninguna tarjeta.
- [x] Borrar el texto del buscador restaura las 8 tarjetas.
- [x] Cada tarjeta navega a su ruta `/ninos/{id}` correcta.
- [x] `/ninos/mateo-fernandez` muestra "Mateo Fernández", "3 años · Sala Soles", la fecha "12 mar 2022", sala "Soles", ingreso "feb 2025" y el panel de alergia con el texto literal del mockup.
- [x] `/ninos/tomas-diaz` muestra el panel de alergia con "Intolerancia a la lactosa. Sin lácteos ni derivados."; `/ninos/sofia-mendez` no muestra el panel.
- [x] La tarjeta de padres de Mateo muestra Lucía Fernández ("Mamá · activa", ACTIVA) y Diego Fernández ("Papá · invitación enviada", PENDIENTE), más "Vincular otro padre".
- [x] La tarjeta de padres de Valentina no lista padres y conserva "Vincular otro padre".
- [x] `/ninos/no-existe` devuelve 404.
- [x] "Volver a Niños" navega a `/ninos`.
- [x] "Agregar niño", "Editar", "Resumen del día" y "Vincular otro padre" tienen `href="#"` y no cambian la URL.
- [x] En `/` la sidebar marca Feed activo; en `/ninos` y en cualquier perfil marca Niños activo, con fondo `#FBE3D8` y texto `#D9583C`; ambas navegan.
- [x] A 390px el grid de niños es de 1 columna, el perfil apila la columna derecha debajo y `documentElement.scrollWidth` no supera `innerWidth`.
- [x] "OpenDayCare", "Niños", los nombres de niño y las iniciales se renderizan en Fredoka; el resto en Nunito.
- [x] Capturas de Playwright en `.playwright-mcp/children-1440.png` y `.playwright-mcp/child-profile-1440.png` comparadas contra renders de `ninos.dc.html` y `perfil-nino.dc.html`: sin diferencias de layout, color ni tipografía.
- [x] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

## Decisions

- **Sí:** `/ninos` y `/ninos/[id]` como URLs en español. Son visibles para el usuario y coinciden con el mockup; los identificadores internos siguen en inglés.
- **Sí:** ruta dinámica con `generateStaticParams` para los 8 niños. Todos los perfiles se prerenderizan y el id de la URL es real.
- **Sí:** datos mock completos para los 8. La pantalla es coherente para cualquier tarjeta en la que se haga clic.
- **No:** perfiles con secciones vacías para los 7 niños sin datos. Habría obligado a inventar estados visuales que la referencia no tiene.
- **Sí:** el panel de alergia se oculta cuando `allergies` está vacío. Es la única forma de no inventar un estado "sin alergias" inexistente.
- **Sí:** Valentina muestra la lista de padres vacía + CTA. El CTA ya comunica el estado; un mensaje extra sería copy inventado.
- **Sí:** buscador en cliente con `useState`. Filtra 8 elementos locales; no justifica servidor ni query params.
- **Sí:** `aria-label="Buscar niño"` en el input en vez de un `<label>` visible. El mockup no tiene label y no se agrega UI nueva.
- **Sí:** búsqueda insensible a acentos y mayúsculas. "sofia" debe encontrar "Sofía"; es lo que el usuario espera de un buscador en español.
- **Sí:** el contador "8 niños" es el total y no el resultado del filtro. El conteo es un dato de la sala, no del filtro.
- **Sí:** `AppSidebarNav` como client component aislado. La sidebar completa no necesita `"use client"`; solo el nav necesita `usePathname`.
- **Sí:** tags y meta derivados en `_data/children.ts`. Evita que los mismos datos vivan en dos formas y garantiza que el listado y el perfil no se contradigan.
- **Sí:** fechas como copy formateado. Consistente con SPEC 01 (`time: "14:20"`) y evita lógica de locale para datos que no son reales.
- **No:** `dayjs`/`date-fns`. Cero dependencias nuevas.
- **Sí:** `${ageLabel} · Sala Soles` usa el nombre largo de la sala en el subtítulo y "Soles" en la fila de la tabla, como el mockup.
- **No:** convertir la sidebar entera en client component. Innecesario y perdería el render de servidor del resto.
- **No:** `dynamicParams` ni configs de ruta. Prohibido por `AGENTS.md` con `cacheComponents`; los ids desconocidos se resuelven con `notFound()`.
- **No:** prototipos de rutas no implementadas. Todos esos enlaces quedan en `#`.
- **No:** `next/image`. No hay imágenes reales, solo iniciales.
- **Sí:** `proxy.ts` con matcher `/ninos/:id` para responder 404 real en ids desconocidos. En producción el shell de PPR se envía con 200 antes de que corra `notFound()`, y `dynamicParams = false` no es compatible con `cacheComponents`. El proxy valida el id antes del render y la página conserva la estructura instantánea con `<Suspense>`.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Con `cacheComponents`, `await params` en una ruta dinámica puede exigir un límite de `Suspense` si el id no viene de `generateStaticParams` | Resuelto con `<Suspense>` + `params.then`; el 404 de ids desconocidos se movió a `proxy.ts` porque `notFound()` posterior al shell de PPR responde 200 y `dynamicParams` no es compatible con `cacheComponents`. |
| "3 años" y "12 mar 2022" son inconsistentes con la fecha real de hoy | Es copy literal de la referencia y no hay cálculo de edad; el dato real llega con la spec de backend. |
| Los 7 perfiles distintos de Mateo contienen datos inventados | Queda registrado: es mock de presentación y no se presenta como dato real. |
| `usePathname` en la sidebar provoca hidratación distinta entre server y cliente | Usar `usePathname` solo para el estado activo, sin renderizar contenido distinto; verificar la consola en `/` y `/ninos`. |
| El grid a 2 columnas queda apretado entre 640px y 760px | Verificar a 700px; si se ve mal, subir el corte del grid a `md` (`768px`). |
| `normalize("NFD")` con diacríticos depende de soporte Unicode moderno | Soportado en todos los navegadores objetivo; el filtro cae a comparación simple si no hay match. |

## What is **not** in this spec

- Alta, edición, borrado o vinculación real de niños y padres.
- Persistencia, API, base de datos o autenticación.
- Las pantallas `/agregar-nino`, `/vincular-padre` y `/resumen-dia`.
- Subida o visualización de fotos de niño.
- Suscripciones, notificaciones o historial del niño.
- Modo oscuro.
- Diseño móvil completo con bottom nav.

Cada uno de esos, si llega, va en su propia spec.

## Verification report

**Fecha:** 2026-10-25 · **Branch:** `spec-02-ninos-y-perfil-nino` · **Agente:** `spec-verifier`

Corrida de verificación sobre la implementación existente en `app/`. **No se modificó ningún archivo de código ni de configuración**: los 28 criterios pasaron con el código actual. Los únicos cambios de esta corrida son las 28 casillas y esta sección.

Punto de partida (branch `spec-02-ninos-y-perfil-nino`): 3 archivos modificados (`app-sidebar.tsx`, `icons.tsx`, `globals.css`) y 5 sin trackear (`app-sidebar-nav.tsx`, `app/_components/children/`, `app/_data/children.ts`, `app/ninos/`, `proxy.ts`). Durante la corrida el usuario volcó ese contenido en el commit `ee9bae6 "spec 02-ninos-perfil"`; al cerrar la verificación, `git diff --name-only -- app proxy.ts` devuelve 0 archivos, así que **toda la evidencia de esta tabla corresponde al commit `ee9bae6`**. El verificador no hizo commit ni stash.

### Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `npm run build` | ✅ exit 0 · `✓ Generating static pages using 7 workers (14/14)` · rutas `/`, `/ninos` (○), `/ninos/[id]` (◐ PPR con 8 hijos `○`) y `ƒ Proxy (Middleware)` registrado. |
| `npx tsc --noEmit` | ✅ exit 0, sin salida. |
| `npx eslint app` | ✅ exit 0, sin salida. (`npm run lint` no se usa como señal: falla por `references/pantallas/support.js`, preexistente.) |
| `grep -rn "references" app/` | ✅ sin coincidencias. |
| `grep -rnE ": any\|as any\|@ts-ignore\|@ts-expect-error\|style=\{\{" app/` | ✅ sin coincidencias. |
| `grep -rnE "#[0-9a-fA-F]{3,8}" app --include=*.tsx --include=*.ts` | ✅ sin coincidencias (los hex viven solo en `@theme` de `globals.css`). |
| `grep -rln '"use client"' app/` | ✅ solo `app/_components/app-sidebar-nav.tsx` y `app/_components/children/children-search.tsx`. |
| `export default` en `app/` | ✅ solo en `layout.tsx`, `page.tsx`, `ninos/page.tsx`, `ninos/[id]/page.tsx`. |
| `curl` dev `:3000` y prod `next start :3210` | ✅ 404 en `/ninos/no-existe`, 200 en `/ninos` y `/ninos/mateo-fernandez` en ambos entornos. |

### Contraste Next.js (Context7 `/vercel/next.js` + docs vendorizadas 16.4.3 en `node_modules/next/dist/docs/`)

- `not-found`: *"The response starts streaming from the `<Suspense>` boundary before `notFound()` runs, so it keeps its `200` status… Calling `notFound()` before streaming starts returns a `404`… **A request-time check can run in Proxy before the page renders.**"* → El `proxy.ts` con matcher `/ninos/:id` es la vía documentada para el 404 real bajo `cacheComponents`. Corregido.
- `streaming`: *"Place `notFound()` before any `await` or `<Suspense>` boundary to return a real 404"* → coherente con que el `notFound()` dentro del `<Suspense>` de la página no alcance para el status; el proxy lo resuelve antes del render.
- `dynamicParams = false` es inválido con `cacheComponents` (el build lo rechaza con `Error: Route segment config "dynamicParams" is not compatible with nextConfig.cacheComponents`) → la decisión del spec de no usarlo está respaldada por la herramienta.
- Convenciones del repo verificadas: sin `dynamic`/`revalidate`/`fetchCache`/`runtime`, sin `postcss.config.*`/`tailwind.config.*`, Server Components por defecto con `"use client"` mínimo, fuentes por `next/font` (SPEC 01). El build registra el proxy como segmento válido.

**Observación menor:** la sección "Tokens y medidas" nombra `--color-badge-pending-fg`, pero el token implementado es `--color-badge-pending` (el valor `#9A7B1E` es correcto y medido). Ningún criterio prueba el nombre del token; no es falla.

### Criterios de aceptación (28/28 PASS)

Evidencia runtime: Playwright, dev `:3000`, viewport 1440×900 salvo donde se indique.

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `npm run build` sin errores | PASS | exit 0, 14/14 páginas, `ƒ Proxy (Middleware)`. |
| 2 | `npx tsc --noEmit` sin errores | PASS | exit 0. |
| 3 | `npx eslint app` sin errores | PASS | exit 0. |
| 4 | Consola sin errores ni warnings en `/ninos` y un perfil | PASS | `browser_console_messages` (warning+error): 0/0 en `/ninos` y en `/ninos/mateo-fernandez` (solo `[HMR] connected` / INFO de DevTools en level info). |
| 5 | `app/` no importa `references/` | PASS | grep sin coincidencias. |
| 6 | Páginas server components; `"use client"` solo en 2 archivos | PASS | `app/ninos/page.tsx` y `app/ninos/[id]/page.tsx` sin directiva; `grep -rln '"use client"' app/` → `app-sidebar-nav.tsx` + `children-search.tsx`. `[id]/page.tsx` renderiza `<Suspense>{params.then(...)}</Suspense>` sin `"use client"`. |
| 7 | 8 tarjetas en orden Mateo→Olivia | PASS | `querySelectorAll('main a[href^="/ninos/"]')` → length 8, hrefs en orden: mateo, sofia, benjamin, valentina, tomas, emma, lucas, olivia. |
| 8 | Inicial y color de avatar por tono | PASS | computed `backgroundColor`: M `rgb(169,217,232)`=sky, S `rgb(244,184,204)`=rose, B `rgb(185,222,196)`=sage, V `rgb(244,220,142)`=sun, T `rgb(201,182,232)`=lilac; y los fg del mockup (p. ej. sky `rgb(31,122,147)`). |
| 9 | Meta exacta por tarjeta | PASS | Mateo "3 años · 2 padres vinculados", Sofía "2 años · 1 padre vinculado", Valentina "2 años · sin padres vinculados", Tomás "3 años · 1 padre vinculado". Derivadas de `parentsSummary`. |
| 10 | Badges solo en Mateo/Valentina/Tomás; chevron en otras 5 | PASS | `lastElementChild` por tarjeta: Mateo `MANÍ`, Valentina `VINCULAR`, Tomás `LACTOSA`; Sofía/Benjamín/Emma/Lucas/Olivia → `<svg>` chevron. |
| 11 | Colores de badge | PASS | MANÍ y LACTOSA `bg rgb(251,216,204)`/`color rgb(217,104,74)` = `#FBD8CC`/`#D9684A`; VINCULAR `rgb(249,210,222)`/`rgb(197,100,134)` = `#F9D2DE`/`#C56486`. |
| 12 | Contador "8 niños" fijo al filtrar | PASS | presente en las tres muestras: sin filtro, con "sofia", con "zzz". |
| 13 | "sofia" → 1 tarjeta; "zzz" → 0 + mensaje | PASS | "sofia" → `["/ninos/sofia-mendez"]` (acento ignorado: "Sofía"); "zzz" → 0 tarjetas y `No encontramos ningún niño con ese nombre.` en DOM. |
| 14 | Borrar restaura 8 | PASS | Ctrl+A + Delete sobre el input → `querySelectorAll(...).length === 8`. |
| 15 | Tarjetas navegan a `/ninos/{id}` | PASS | click en Benjamín → `location.pathname === "/ninos/benjamin-ruiz"`; click en Olivia (test 21) → `/ninos/olivia-vega` navegado antes de volver. |
| 16 | Perfil Mateo completo | PASS | h1 "Mateo Fernández", subtítulo "3 años · Sala Soles", tabla "12 mar 2022"/"Soles"/"feb 2025", panel con "Alergias y notas" y nota literal "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila." |
| 17 | Panel condicional | PASS | Tomás: panel presente con "Intolerancia a la lactosa. Sin lácteos ni derivados." y `bg rgb(251,218,214)`=`#FBDAD6`; Sofía: sin "Alergias y notas". |
| 18 | Padres de Mateo | PASS | "Lucía Fernández" + "Mamá · activa" + badge ACTIVA `rgb(207,235,216)`/`rgb(62,155,108)`; "Diego Fernández" + "Papá · invitación enviada" + badge PENDIENTE `rgb(247,231,166)`/`rgb(154,123,30)`; avatares 40px `#C9B6E8`(madre)/`#A9C7E8`(padre) en blanco, Fredoka; "Vincular otro padre". (Tomás añade variante "Papá · activo"/"ACTIVO".) |
| 19 | Valentina sin padres, con CTA | PASS | `textContent` de la card == "PADRES VINCULADOSVincular otro padre": cero filas de padres, CTA presente. |
| 20 | `/ninos/no-existe` → 404 | PASS | dev `:3000` → 404; **prod `next start :3210` → 404** (vía `proxy.ts`, porque el `<Suspense>` de `[id]/page.tsx` respondería 200). `/ninos/mateo-fernandez` → 200 en ambos. |
| 21 | "Volver a Niños" navega a `/ninos` | PASS | click desde el perfil de Olivia → `location.pathname === "/ninos"`. |
| 22 | Enlaces `href="#"` inertes | PASS | En perfil se listan exactamente `Editar`, `Resumen del día`, `Vincular otro padre` con `href="#"`; tras clickgear los tres, pathname sin cambio. En `/ninos`, "Agregar niño" `href="#"` sin cambio. |
| 23 | Sidebar activa y navega | PASS | `/` → `aria-current="page"` en Feed con `bg rgb(251,227,216)`=`#FBE3D8` / `color rgb(217,88,60)`=`#D9583C`; click Niños → `/ninos` y activo= Niños (mismos colores); en `/ninos/mateo-fernandez` y `/ninos/benjamin-ruiz` activo = Niños (por `pathname.startsWith("/ninos/")`). Nav links: `["/","/ninos","#","#"]`. |
| 24 | 390px responsive | PASS | `/ninos` a 390: `scrollWidth 380 ≤ innerWidth 390`, grid `1` columna; perfil a 390: `flexDirection: column` y la columna derecha cae debajo de la izquierda (`right.top ≥ left.bottom`), `scrollWidth 380 ≤ 390`. |
| 25 | Fredoka / Nunito | PASS | computed `fontFamily`: OpenDayCare, h1 "Niños", nombre de niño e inicial del avatar → `Fredoka`; meta y body → `Nunito`. `document.fonts.check('600 30px Fredoka')` y `('400 15px Nunito')` → `true`. |
| 26 | Capturas vs mockups | PASS | `children-1440.png` ≡ `mock-ninos-1440.png` y `child-profile-1440.png` ≡ `mock-perfil-1440.png` (1440×900, mismo viewport ambos lados): sin diferencias de layout, jerarquía, color, tipografía, espaciado ni bordes. Medidas auxiliares coincidentes con el spec: radio tarjeta `18px`, padding `16px`, gap `14px`, avatar `48px`/`84px`, radio buscador `14px` con padding `12px 16px`, placeholder `rgb(182,169,155)`=`#B6A99B`, CTA radio `14px` padding `11px 18px`, h1 `30px`/600, nota de alergia `14.5px` con `line-height 21.75px` (ratio 1.50). *Nota de higiene:* para la comparación se ocultó el indicador de dev `<nextjs-portal>` con CSS al vuelo en el browser; es artefacto del dev server, no del producto. |
| 27 | Identificadores en inglés | PASS | Auditoría de los 11 archivos nuevos: funciones/tipos/campos/constantes en inglés (`getChildTag`, `parentsSummary`, `PARENT_STATUS_COPY`, `normalize`, `isActive`, `CHILD_IDS`, `SIZE_STYLES`…). El español aparece solo en strings de copy y en clases derivadas de tokens. |
| 28 | Sin `any`, `@ts-ignore`, `style={{}}` ni hex en JSX | PASS | grep sobre `app/`: 0 coincidencias de `: any`, `as any`, `@ts-ignore`, `@ts-expect-error`, `style={{`; 0 hex en `.ts/.tsx` (solo en `@theme` de `globals.css`). |

### Artefactos (en `.playwright-mcp/`, gitignored)

- `children-1440.png` — `/ninos` app, 1440×900 (criterio 26).
- `child-profile-1440.png` — `/ninos/mateo-fernandez` app (criterio 26).
- `mock-ninos-1440.png` — render de `references/pantallas/ninos.dc.html` (servido en `127.0.0.1:8971` en modo lectura).
- `mock-perfil-1440.png` — render de `references/pantallas/perfil-nino.dc.html`.

### Archivos modificados en esta corrida

- `specs/02-ninos-y-perfil-nino.md`: 28 casillas marcadas + esta sección. Ningún archivo de `app/`, `proxy.ts`, `references/` o configuración fue tocado (el diff de código al cerrar la corrida está vacío).

### Desviaciones ya documentadas (no fallas)

- `app/ninos/[id]/page.tsx` no usa `await params` plano: usa `<Suspense>{params.then(...)}</Suspense>` (para no violar la validación de PPR) y el 404 real lo da `proxy.ts`. Ya está registrado en **Decisions** y **Risks** del spec; el criterio 20 pasa en dev y prod.
- `--color-badge-pending` en lugar del nombre teórico `--color-badge-pending-fg`; valor correcto y medido (criterio 18 PASS).

### Pendientes y riesgos

- Nada pendiente: 28/28 verificados con evidencia.
- Con todo en PASS corresponde pasar `**Status:**` a `Implementado`; el cambio de estado y el commit los hace el usuario (el workflow nunca commitea por su cuenta).
- El dev server de `:3000` queda corriendo (levantado en esta corrida). El servidor de referencia en `:8971` fue detenido al cerrar el navegador; `next start :3210` fue detenido tras validar el 404.

