# SPEC 01 — Feed como home, estilo idéntico al mockup

> **Status:** Inplementado
> **Depends on:** ninguna
> **Date:** 2026-10-25
> **Objective:** Implementar `/` como el feed de OpenDayCare con el shell (sidebar + contenido) visualmente idéntico a `references/pantallas/feed.dc.html`, alimentado por datos mock locales y sin autenticación ni base de datos.

## Por qué existe esta spec

- Es la primera pantalla del producto y define el lenguaje visual que heredarán las otras 14.
- Rompe el starter de `create-next-app` (Geist, dark mode, `lang="en"`, metadata de ejemplo) y fija tokens en `globals.css`.
- El sidebar y el shell se extraen ahora para que las pantallas futuras no los dupliquen.

## Scope

**In:**

- `app/globals.css`: tokens de color y tipografía en `@theme`, fondo/ink globales, scrollbar delgado, sin dark mode.
- `app/layout.tsx`: Fredoka + Nunito vía `next/font/google`, `lang="es"`, metadata del producto, `AppShell` envolviendo `children`.
- `app/_components/app-shell.tsx`: contenedor `flex` + `aside` + `main` con scroll propio, usado por el root layout.
- `app/_components/app-sidebar.tsx`: logo + "Sala Soles", CTA "Nueva publicación", nav (Feed activo, Niños, Avisos, Mi cuenta), footer con "Caro Giménez · Maestra · Soles" y botón de salir.
- `app/_components/feed/feed-composer.tsx`: compositor "Compartí un momento…" con avatar y botón de cámara.
- `app/_components/feed/post-type-badge.tsx`: badge LOGRO / ACTIVIDAD / ANUNCIO con su color.
- `app/_components/feed/feed-post.tsx`: card de publicación (avatar, autor, hora, audiencia, cuerpo, placeholder de foto opcional, footer de like/comentario/Editar).
- `app/_components/icons.tsx`: los SVG del mockup como componentes (sol, plus, home, usuarios, campana, usuario, salir, cámara, corazón, comentario, imagen, megáfono).
- `app/_data/feed.ts`: tipos `Post`, `Avatar`, `AvatarTone`, `PostKind` + `currentUser`, `currentRoom` y los 3 posts.
- `app/page.tsx`: saludo, compositor, separador "PUBLICADO HOY" y las 3 publicaciones.
- Degradación por debajo de `lg` (1024px): sidebar oculto, barra superior simple con logo + CTA, `main` a ancho completo.

**Out of scope (para specs futuras):**

- Autenticación, sesión real, base de datos o cualquier fetch.
- Rutas `/crear-publicacion`, `/ninos`, `/avisos`, `/mi-cuenta`, `/detalle-publicacion`, `/foto`, `/login`: no se crean stubs.
- Likes y comentarios funcionales.
- Diseño móvil real (bottom nav, gestos).
- Modo oscuro.

## Data model

```ts
// app/_data/feed.ts
export type PostKind = "achievement" | "activity" | "announcement";

export type AvatarTone = "sky" | "indigo" | "coral";

export type Avatar =
  | { kind: "initial"; text: string; tone: AvatarTone }
  | { kind: "icon"; icon: "megaphone"; tone: AvatarTone };

export type Post = {
  id: string;
  kind: PostKind;
  avatar: Avatar;
  authorName: string; // copy: "Mateo" | "Anuncio general"
  time: string; // copy: "14:20"
  publishedBy: string; // copy: "publicado por vos"
  audience: string; // copy: "familia de Mateo" | "toda la sala"
  body: string; // copy literal del mockup
  photoLabel?: string; // copy: "Foto · pintando con témperas"
  likes: number;
  comments: number;
};

export const currentUser = {
  name: "Caro Giménez",
  initial: "C",
  role: "Maestra · Soles",
} as const;

export const currentRoom = {
  name: "Sala Soles",
  eyebrow: "GUARDERÍA · SALA SOLES",
  greeting: "Buenas, Caro",
  summary: "12 niños · martes 17 jun",
} as const;

export const posts: Post[] = [
  // 3 publicaciones, ver tabla de datos
];
```

Datos fijos, literales del mockup:

| Campo         | Valor                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `currentUser` | `{ name: "Caro Giménez", initial: "C", role: "Maestra · Soles" }`                                 |
| `currentRoom` | `{ name: "Sala Soles", eyebrow: "GUARDERÍA · SALA SOLES", greeting: "Buenas, Caro", summary: "12 niños · martes 17 jun" }` |
| post 1        | `achievement`, Mateo / M / sky, `14:20`, `familia de Mateo`, likes 3, comments 1                   |
| post 2        | `activity`, Mateo / M / sky, `09:40`, `familia de Mateo`, `photoLabel` presente, likes 5, comments 2 |
| post 3        | `announcement`, Anuncio general / megaphone / indigo, `07:50`, `toda la sala`, likes 8, comments 0  |

Convenciones:

- Los textos de los 3 posts se copian literalmente del mockup, incluidos acentos y signos (`¡Usó el orinal solito por primera vez!…`).
- Los valores de `kind` van en inglés (`achievement`, `activity`, `announcement`); la etiqueta visible en español (`LOGRO`, `ACTIVIDAD`, `ANUNCIO`) se resuelve con un mapa tipado en `post-type-badge.tsx`.
- El color del badge se deriva de `kind` en `post-type-badge.tsx`; no se guarda en el dato.
- El color del avatar se deriva de `avatar.tone`; no se guardan hex en los datos.
- Ni `currentUser` ni `currentRoom` representan una sesión real: son constantes de presentación. Por eso no se llaman `session`.

## Tokens y medidas

`app/globals.css` define en `@theme`:

| Token                                                                                    | Valor                | Uso                                   |
| ---------------------------------------------------------------------------------------- | -------------------- | ------------------------------------- |
| `--color-cream`                                                                          | `#F6ECDF`            | fondo de la app y del botón de salir  |
| `--color-surface`                                                                        | `#FFFDF9`            | sidebar y cards                       |
| `--color-border`                                                                         | `#ECE0D0`            | bordes de sidebar/cards               |
| `--color-ink`                                                                            | `#3F362E`            | texto principal                       |
| `--color-body`                                                                           | `#4A4038`            | cuerpo de las publicaciones           |
| `--color-muted`                                                                          | `#94887B`            | texto secundario                      |
| `--color-muted-soft`                                                                     | `#A89A8B`            | hora, audiencia, rol                  |
| `--color-eyebrow`                                                                        | `#D9583C`            | "GUARDERÍA · SALA SOLES" y nav activo |
| `--color-coral`                                                                          | `#F2937A`            | avatar del usuario                    |
| `--color-coral-icon`                                                                     | `#E0654A`            | like, cámara                          |
| `--color-coral-link`                                                                     | `#C5503A`            | "Editar"                              |
| `--color-coral-soft`                                                                     | `#FBE3D8`            | nav activo y botón de cámara          |
| `--color-cta-from`                                                                       | `#F4977E`            | CTA "Nueva publicación", inicio       |
| `--color-cta-to`                                                                         | `#EE8164`            | CTA "Nueva publicación", fin          |
| `--color-separator`                                                                      | `#E7DAC8`            | línea de "PUBLICADO HOY"              |
| `--color-divider`                                                                        | `#F0E6D8`            | divisor del footer del post           |
| `--color-photo-bg`                                                                       | `#F4ECE1`            | fondo del placeholder de foto         |
| `--color-photo-border`                                                                   | `#DBCDBA`            | borde del placeholder de foto         |
| `--color-photo-text`                                                                     | `#B0A290`            | texto e icono del placeholder         |
| `--font-display`                                                                         | Fredoka              | títulos, nombres, iniciales           |
| `--font-sans`                                                                            | Nunito               | todo el resto                         |

Medidas que deben respetarse:

- Sidebar `248px`, padding `24px 16px`, `border-right 1px #ECE0D0`, alto `100dvh`, sticky.
- Contenido: `max-width 760px`, centrado, `padding 34px 40px 80px`.
- H1 `30px` Fredoka 600; eyebrow `12.5px` 800 con `letter-spacing .8px`.
- Card: radio `20px`, padding `20px 22px`, `box-shadow 0 4px 16px -12px rgba(120,90,60,.5)`, gap entre cards `16px`.
- Avatar de post `44px`; avatar del usuario `38px`; iniciales Fredoka 600.
- Placeholder de foto: alto `200px`, radio `16px`, borde `1.5px dashed #DBCDBA`.
- Body del post `15.5px`, `line-height 1.55`.

## Convenciones de código

- **Identificadores en inglés.** Nombres de archivos, componentes, tipos, campos, constantes, variables y funciones. El copy visible y los datos de ejemplo van en español.
- **Copy fuera del código.** Las etiquetas (`LOGRO`, `Nueva publicación`, `Compartí un momento…`) son datos o texto JSX, nunca identificadores.
- **Named exports** en componentes y datos (`export function FeedPost`). `export default` se reserva para `app/page.tsx` y `app/layout.tsx`, que Next lo exige.
- **Un componente principal por archivo**, en PascalCase, con archivo en kebab-case (`feed-post.tsx` → `FeedPost`).
- **Mapas tipados** para lo que varía por tipo: `Record<PostKind, PostKindStyle>` y `Record<AvatarTone, string>`. Nada de `if/else` encadenados ni de hex sueltos en el JSX.
- **Sin `any`, sin `as` y sin `@ts-ignore`.** Si un tipo no cierra, se corrige el tipo.
- **Server components por defecto.** `"use client"` solo si hay estado o eventos; en esta spec no hace falta.
- **`app/page.tsx` solo compone.** No calcula estilos ni transforma datos.
- **Sin `style={{}}`.** Gradientes y sombras van con clases arbitrarias de Tailwind (`bg-[linear-gradient(180deg,#F4977E,#EE8164)]`, `shadow-[...]`).
- **Inmutabilidad.** Constantes de datos con `as const`; los arrays se exportan tipados y no se mutan.
- **Iconos** con `stroke="currentColor"` y props `React.SVGProps<SVGSVGElement>`, para que hereden tamaño y color.
- **Comentarios solo para el porqué**, nunca para repetir lo que el código ya dice.

## Implementation plan

1. **Tokens y base.** Reescribir `app/globals.css` con `@import "tailwindcss"`, el bloque `@theme` de la tabla, `body` con `bg-cream text-ink font-sans` y el scrollbar de 10px. Quitar dark mode y las variables `--background`/`--foreground`. Test: `npm run dev` muestra el starter sobre fondo crema.
2. **Fuentes y metadata.** En `app/layout.tsx` cargar `Fredoka` (400–700) y `Nunito` (400–800) con `variable: "--font-display"` / `"--font-sans"`, `lang="es"`, `metadata.title = "OpenDayCare"`, description del producto. Test: `npx tsc --noEmit` limpio y la página usa Fredoka/Nunito.
3. **Iconos y datos.** Crear `app/_components/icons.tsx` y `app/_data/feed.ts` con los tipos, `currentUser`, `currentRoom` y los 3 posts. Test: `npx tsc --noEmit` limpio.
4. **Shell y sidebar.** Crear `app-shell.tsx` y `app-sidebar.tsx`; montar `AppShell` en `layout.tsx` envolviendo `children`. Incluir la barra superior `lg:hidden`. Test: el sidebar se ve en `/` con "Feed" activo y scroll propio en `main`.
5. **Composer y badge.** Crear `feed-composer.tsx` y `post-type-badge.tsx`, este último con el mapa `Record<PostKind, PostKindStyle>` que resuelve etiqueta y colores. Test: se renderizan con los colores del mockup.
6. **Card de publicación.** Crear `feed-post.tsx` con avatar, meta, badge, audiencia, cuerpo, foto opcional y footer. Los estilos del avatar salen de `Record<AvatarTone, string>`. Test: renderiza el post `achievement` sin foto y el `activity` con placeholder.
7. **Página.** Reescribir `app/page.tsx` como server component: header, composer, separador y `posts.map((post) => <FeedPost key={post.id} post={post} />)`. Test: `/` muestra las 3 publicaciones en orden.
8. **Ajuste responsive.** Verificar `hidden lg:flex` del sidebar, la barra superior y paddings reducidos. Test: sin scroll horizontal a 390px y layout idéntico a 1440px.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npx eslint app` sin errores.
- [x] La consola del navegador no muestra errores ni warnings de React.
- [x] `app/` no importa nada de `references/`.
- [x] El fondo de la app es `#F6ECDF` también con `prefers-color-scheme: dark`.
- [x] El sidebar mide `248px`, fondo `#FFFDF9`, y "Feed" aparece activo con fondo `#FBE3D8` y texto `#D9583C`.
- [x] "OpenDayCare", "Buenas, Caro", los nombres de autor y las iniciales de avatar se renderizan en Fredoka; el resto en Nunito.
- [x] Se ven exactamente 3 publicaciones, en el orden del mockup: `achievement`, `activity`, `announcement`.
- [x] Los badges dicen LOGRO / ACTIVIDAD / ANUNCIO y usan `#CFEBD8`+`#3E9B6C`, `#C7E7F1`+`#2E89A6`, `#CCD8F4`+`#4E72C8`.
- [x] Los contadores muestran 3/1, 5/2 y 8/0, y no cambian al hacer click.
- [x] La publicación de actividad muestra el placeholder punteado de `200px` con "Foto · pintando con témperas".
- [x] Todos los enlaces del shell y del feed tienen `href="#"` y no navegan.
- [x] A 1024px o menos el sidebar no se muestra y aparece la barra superior con logo y CTA.
- [x] A 390px de ancho no hay scroll horizontal.
- [x] Captura de Playwright en `.playwright-mcp/feed-1440.png` comparada contra un render de `references/pantallas/feed.dc.html`: sin diferencias apreciables de layout, color ni tipografía.
- [x] Ningún identificador de `app/` está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

## Decisions

- **Sí:** Tailwind con tokens en `@theme`. Una sola fuente de verdad de color reutilizable por las otras pantallas.
- **Sí:** identificadores en inglés y copy en español. Las etiquetas visibles son presentación, no nombres de dominio; mezclar idiomas en el código envejece mal.
- **Sí:** mapas `Record<PostKind, ...>` y `Record<AvatarTone, ...>`. Garantizan exhaustividad al agregar un tipo nuevo y evitan condicionales repetidos.
- **No:** estilos inline copiados del mockup. Máxima fidelidad inmediata, pero imposible de mantener y de reutilizar.
- **No:** CSS Modules. Añade archivos sin beneficio frente a tokens + utilidades.
- **Sí:** shell y sidebar en `app/layout.tsx`, contenido en `app/page.tsx`. Las 14 pantallas restantes heredan la navegación sin duplicarla.
- **Sí:** `app/_components/` (carpeta privada de Next, no genera rutas) importada como `@/app/_components/...`.
- **Sí:** datos mock tipados en `app/_data/feed.ts`. La UI queda tonta y la spec de detalle reutiliza los tipos.
- **No:** estado de like, ni `"use client"`. Todo es server component; no hay datos request-time, así que no se usa `use cache` ni `<Suspense>`.
- **Sí:** `next/font/google`. Sin request a Google en runtime y sin FOUT, alineado con la optimización de Next 16.
- **Sí:** copy literal, sin fecha dinámica. No hay sesión real; una fecha calculada mentiría sobre el contexto.
- **Sí:** `href="#"` en todos los enlaces. Evita rutas 404 y stubs que ensucien el alcance.
- **No:** páginas stub. Cada pantalla llega con su propia spec.
- **Sí:** desktop-first con degradación mínima (sidebar oculto + barra superior reutilizando logo y CTA). El mockup no define móvil y no se inventa un diseño nuevo.
- **No:** `next/image` para la foto. No hay imagen real: el mockup usa un placeholder punteado.
- **No:** modo oscuro. El starter lo trae por defecto y el producto es claro.

## Risks

| Risk                                                                  | Mitigation                                                                               |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Diferencias tipográficas entre Fredoka/Nunito locales y el CDN del mockup | Comparación con Playwright y ajuste de `line-height`/`letter-spacing` en la misma iteración. |
| `100vh` en mobile provoca saltos por la barra del navegador            | Usar `h-dvh` en sidebar y `main`.                                                        |
| La captura de referencia está escalada, no es 1:1 con 1440px           | Comparación visual de layout/color, no pixel-diff automático.                            |
| La degradación móvil es una mínima invención                          | Queda registrada como fuera de alcance; si se quiere móvil real, va en su propia spec.   |

## What is **not** in this spec

- Autenticación, sesión, base de datos o fetch de cualquier tipo.
- Las pantallas de crear publicación, detalle, niños, avisos, mi cuenta, foto y login.
- Likes y comentarios funcionales.
- Modo oscuro.
- Diseño móvil completo.
- Tests automatizados y despliegue.

Cada uno de esos, si llega, va en su propia spec.

## Verification report

**Fecha:** 2026-10-25 · **Branch:** `spec-01-feed-home` (tree limpio al inicio de la corrida) · **Agente:** `spec-verifier`

La implementación ya existía en `app/`. En esta corrida **no se modificó ningún archivo de código**: los 18 criterios pasaron con el código actual. El único cambio fue de verificación: el criterio 16 se reescribió (con aprobación del usuario) para comparar contra el mockup canónico `references/pantallas/feed.dc.html` en vez de `references/screenshots/feed.png`, que está desactualizado (ver detalle abajo).

### Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `npm run build` | ✅ `Compiled successfully in 2.4s`, TypeScript ok, 4/4 páginas estáticas, rutas `/` y `/_not-found`. |
| `npx tsc --noEmit` | ✅ exit 0, sin salida. |
| `npx eslint app` | ✅ exit 0, sin salida. |
| `grep -rn "references" app/` | ✅ sin coincidencias. |
| `grep -rnE "any\|@ts-ignore\|style=\{\{ \|#[0-9a-fA-F]{3,8}" app/**` | ✅ sin coincidencias (los hex viven solo en `@theme` de `app/globals.css`). |

Contraste Next.js (Context7 `/vercel/next.js` — `docs/…/components/font.mdx` — y docs vendorizadas en `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md`): `next/font/google` con `variable` + `@theme inline` es el patrón recomendado para Tailwind 4; `weight: "variable"` es válido/default para fuentes variables. Sin `dynamic`/`revalidate`/`fetchCache`/`runtime`, sin `postcss.config.*`/`tailwind.config.*`, todo server components (sin `"use client"`).

### Criterios de aceptación (18/18 PASS)

| # | Criterio | Estado | Evidencia (Playwright @ 1440x900, dev :3000) |
| --- | --- | --- | --- |
| 1 | `npm run build` sin errores | PASS | salida arriba (Compiled successfully, exit 0). |
| 2 | `npx tsc --noEmit` sin errores | PASS | exit 0, sin salida. |
| 3 | `npx eslint app` sin errores | PASS | exit 0, sin salida. |
| 4 | Consola sin errores ni warnings de React | PASS | `browser_console_messages` tras navegación fresca y clicks: 0 errors / 0 warnings (solo INFO de React DevTools y `[HMR] connected`). |
| 5 | `app/` no importa `references/` | PASS | `grep -rn "references" app/` → sin coincidencias. |
| 6 | Fondo `#F6ECDF` con `prefers-color-scheme: dark` | PASS | `browser_emulate_media({colorScheme:"dark"})` con `matchMedia` confirming: body/shell `rgb(246,236,223)`; aside/cards `rgb(255,253,249)`. Sin `dark:` ni `prefers-color-scheme` en `app/`. |
| 7 | Sidebar 248px / `#FFFDF9` / Feed activo `#FBE3D8`+`#D9583C` | PASS | aside: `width 248px`, `bg rgb(255,253,249)`, `border-right 1px rgb(236,224,208)`, `padding 24px 16px`, `sticky`, altura = viewport. `a[aria-current="page"]` "Feed": `bg rgb(251,227,216)`, `color rgb(217,88,60)`. |
| 8 | Fredoka en títulos/nombres/iniciales; Nunito en el resto | PASS | `getComputedStyle`: "OpenDayCare" (sidebar y topbar) `Fredoka 17px/600`; H1 `Fredoka 30px/600`; autores `Fredoka 16.5px`; iniciales de avatar `Fredoka 600` (44px); body/eyebrow/nav/auditores `Nunito`. `document.fonts.check` true para ambas. |
| 9 | Exactamente 3 posts en orden achievement/activity/announcement | PASS | `document.querySelectorAll("main article").length === 3`; DOM: badge 1 LOGRO, badge 2 ACTIVIDAD, badge 3 ANUNCIO; copys "14:20"/"09:40"/"07:50". |
| 10 | Badges LOGRO/ACTIVIDAD/ANUNCIO con sus colores | PASS | computed: `rgb(207,235,216)`+`rgb(62,155,108)`; `rgb(199,231,241)`+`rgb(46,137,166)`; `rgb(204,216,244)`+`rgb(78,114,200)` (== hex del criterio), dot y texto incluidos. |
| 11 | Contadores 3/1, 5/2, 8/0 inmutables al click | PASS | clicks reales en corazón, comentario (posts 1 y 2), Editar, nav "Niños", CTA, composer y foto: tras cada click los textos siguen `3/1`, `5/2`, `8/0` y `location.href === http://localhost:3000/`. |
| 12 | Placeholder 200px punteado con "Foto · pintando con témperas" | PASS | computed: `height 200px`, `dashed`, `border-color rgb(219,205,186)` (#DBCDBA), radio 16px, `bg rgb(244,236,225)` (#F4ECE1), texto exacto. La clase declarada es `border-[1.5px]`; Chromium cuantiza el computed a "1px" también en el mockup a DPR=1 (medido), render idéntico. |
| 13 | Todos los enlaces `href="#"` y no navegan | PASS | 16 anchors en DOM, `getAttribute("href") === "#"` en el 100%; clicks en los 9 tipos de enlace: URL sin cambio, sin navegación de ruta. |
| 14 | ≤1024px: sidebar oculto, barra superior con logo + CTA | PASS | `browser_resize 1024`: aside `display:none`; header `display:flex` con "OpenDayCare" y CTA "Nueva publicación" (`href="#"`). En 1023 igual; en 1025 el sidebar vuelve a `flex` y el header se oculta (breakpoint custom `--breakpoint-shell: 1025px`). |
| 15 | 390px sin scroll horizontal | PASS | a 390px: `documentElement.scrollWidth 380 ≤ innerWidth 390`; barrido de `getBoundingClientRect()` sin elementos fuera del viewport; sidebar oculto y topbar visible. |
| 16 | `feed-1440.png` vs render de `references/pantallas/feed.dc.html` | PASS | Comparación visual `feed-1440.png` (app, 1440x900) contra `.playwright-mcp/mock-feed-1440.png` (render del mockup canónico): sin diferencias de layout, jerarquía, color, tipografía, espaciado ni bordes. Ver detalle abajo. |
| 17 | Identificadores de `app/` en inglés | PASS | Auditoría de los 12 archivos: nombres de archivos kebab-case, componentes/tipos/campos/constantes en inglés (`posts`, `authorName`, `AVATAR_TONE_STYLES`, `NAV_ITEMS`…); el español aparece solo en strings de copy y en clases de Tailwind derivadas de tokens (`text-eyebrow`). |
| 18 | Sin `any`, `@ts-ignore`, `style={{}}` ni hex en JSX | PASS | grep sobre `app/**`: 0 coincidencias; los hex están únicamente en `@theme` de `globals.css`; gradientes como `bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))]`. |

### Detalle del criterio 16

Criterio reescrito con aprobación del usuario en esta corrida: la comparación pasa de `references/screenshots/feed.png` al mockup canónico `references/pantallas/feed.dc.html`, que es la fuente de verdad según `AGENTS.md` y el Objective del spec.

Motivo: `feed.png` es un render de una versión anterior del mockup y difiere del mockup actual en 2 puntos, ambos ya fijados por la tabla de datos de este spec:

1. **Corazón de like**: la captura vieja lo muestra contorneado y gris; el mockup canónico lo declara lleno en `#E0654A` (`fill="#E0654A"`). La app renderiza el corazón lleno coral, idéntico al mockup actual (verificado midiendo el mockup servido en `http://127.0.0.1:8099/feed.dc.html`).
2. **Rol del footer del sidebar**: la captura vieja muestra "Maestra · Sala Soles" (2 líneas); el mockup actual y la tabla de datos de este spec dicen `role: "Maestra · Soles"`, que es lo que renderiza la app.

Verificación: `.playwright-mcp/feed-1440.png` (viewport 1440x900, sin el overlay de dev de Next) contra `.playwright-mcp/mock-feed-1440.png` (render del mockup actual a la misma resolución) → sin diferencias apreciables de layout, color ni tipografía. Los crops `ref-crop-footer.png` y `ref-crop-like.png` documentan el desfase de la captura antigua.

**Nota:** `references/screenshots/feed.png` sigue desactualizado en disco; si se regenera en el futuro, sale del mockup actual. No se tocó `references/`.

### Artefactos (en `.playwright-mcp/`, gitignored)

- `feed-1440.png` — captura oficial del criterio 16 (app, 1440x900).
- `mock-feed-1440.png` — render del mockup canónico, referencia del criterio 16.
- `ref-crop-footer.png`, `ref-crop-like.png` — crops de `references/screenshots/feed.png` que evidencian que esa captura quedó desactualizada.

### Archivos modificados en esta corrida

- `specs/01-feed-home.md` (marcas + este reporte). Ningún archivo de `app/`, `references/`, config o dependencias fue tocado.

### Pendientes y riesgos

- Criterio 16 reescrito y verificado (18/18 PASS). Nada pendiente en la verificación.
- `references/screenshots/feed.png` sigue desactualizado respecto al mockup; si se usa en otra spec, comparar contra `feed.dc.html` o regenerarlo.
- El dev server de `:3000` (PID 24452, mismo dir) ya existía al iniciar la fase runtime y se reutilizó; quedó corriendo. El servidor temporal `:8099` para medir el mockup fue detenido y el navegador cerrado.
- Con 18/18 verificados, corresponde pasar `**Status:**` a `Implemented`; el cambio de estado lo hace el usuario (o se pide explícitamente).
