# SPEC 03 — Login y activación de cuenta

> **Status:** Inplementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-26
> **Objective:** Implementar `/login` y `/activar-cuenta` como las pantallas `login.dc.html` (sin el selector Personal/Familia) y `activar-cuenta.dc.html`, con datos mock locales y sin autenticación real.

## Por qué existe esta spec

- Es la primera pantalla del producto fuera del shell: obliga a separar el layout de la app del layout raíz.
- Rompe la regla de SPEC 01 ("todos los enlaces en `#`"), porque `/login` y `/activar-cuenta` pasan a existir y los CTAs navegan.
- La referencia trae un selector de rol que el producto no quiere; se documenta explícitamente qué se quita para que la fidelidad visual no se confunda con un olvido.

## Scope

**In:**

- `app/layout.tsx`: queda solo con `html`, `body`, fuentes (`Fredoka`/`Nunito`), `metadata` global y `globals.css`. Deja de montar `AppShell`.
- `app/(app)/layout.tsx`: nuevo layout del grupo que monta `AppShell` con `children`.
- Mover `app/page.tsx` → `app/(app)/page.tsx` y `app/ninos/**` → `app/(app)/ninos/**`. Las URLs no cambian.
- `app/(auth)/layout.tsx`: contenedor `min-h-dvh` con fondo `auth-bg`.
- `app/(auth)/login/page.tsx`: dos columnas, panel coral + formulario, sin "INGRESO COMO" ni botones Personal/Familia.
- `app/(auth)/activar-cuenta/page.tsx`: columna centrada con logo, tarjeta de invitación, campos, consentimiento y CTA.
- `app/_components/auth/login-hero.tsx`: panel coral con logo, titular, párrafo, círculos decorativos y "🌿 Guardería Sala Soles".
- `app/_components/auth/auth-logo.tsx`: marca cuadrada con `SunIcon` en dos variantes (`hero` 46px translúcida, `brand` 58px con gradiente y sombra).
- `app/_components/auth/auth-field.tsx`: label en mayúsculas + `<input>`; variantes `default`, `code` (18px, `letter-spacing 3px`, Fredoka) y `password`.
- `app/_components/auth/auth-submit.tsx`: CTA gradiente que envuelve un `Link`.
- `app/_components/auth/auth-footer.tsx`: texto centrado + link ("¿Te invitó la guardería? Activá tu cuenta" / "¿Ya tenés cuenta? Iniciar sesión").
- `app/_components/auth/invite-summary.tsx`: tarjeta blanca con avatar "M" sky y "Mateo · Sala Soles".
- `app/_components/auth/consent-checkbox.tsx`: único client component; checkbox de autorización de fotos con estado inicial marcado.
- `app/_data/auth.ts`: const `invite` con el código, el email y los datos de la invitación.
- `app/_components/icons.tsx`: agregar `CheckIcon`.
- `app/_components/app-sidebar.tsx`: el botón "Cerrar sesión" pasa de `href="#"` a `href="/login"`.
- `app/globals.css`: tokens de las pantallas de auth, sombra del CTA y fondo `#FBF4EC`.
- Degradación: bajo `lg` (1024px) el panel coral se oculta y el formulario ocupa el ancho completo.

**Out of scope (para specs futuras):**

- Autenticación real, sesión, cookies, middleware de protección o guardas de ruta.
- Validación de campos, mensajes de error, estados de carga y "recuperar contraseña".
- Selector Personal/Familia y cualquier distinción de rol.
- Feed familiar (`familia-feed.dc.html`) como destino propio: "Activar mi cuenta" va a `/`.
- Toggle de mostrar contraseña, medidor de fuerza, i18n.
- Tests automatizados y modo oscuro.

## Data model

```ts
// app/_data/auth.ts
export type Invite = {
  childName: string; // copy: "Mateo"
  initial: string; // copy: "M"
  roomName: string; // copy: "Sala Soles"
  invitationCode: string; // copy: "7K4P9"
  email: string; // copy: "lucia.fernandez@gmail.com"
};

export const invite: Invite = {
  childName: "Mateo",
  initial: "M",
  roomName: "Sala Soles",
  invitationCode: "7K4P9",
  email: "lucia.fernandez@gmail.com",
};
```

Convenciones:

- No hay estado de sesión ni usuario autenticado. `invite` es dato de presentación, igual que `currentUser` en SPEC 01.
- El color del avatar de la invitación no viaja en los datos: hay una sola invitación y el tono sky es presentación. Las clases `child-sky` viven en `invite-summary.tsx`.
- El email del login (`caro@opendaycare.com`) es copy literal del mockup y vive en el JSX de la página como `defaultValue`, no en `_data/auth.ts`.
- La contraseña de `activar-cuenta` es `defaultValue="contraseña"`, literal del mockup.
- No se agregan tipos para el formulario: los inputs son no controlados.

## Tokens y medidas

Nuevos tokens en `@theme` de `app/globals.css` (el resto se reutiliza de SPEC 01 y 02):

| Token | Valor | Uso |
| ----- | ----- | --- |
| `--color-auth-bg` | `#FBF4EC` | fondo de las dos pantallas (distinto del `cream #F6ECDF` de la app) |
| `--color-auth-hero-from` | `#F6A98E` | gradiente del panel, inicio |
| `--color-auth-hero-mid` | `#F2937A` | gradiente del panel, 45% |
| `--color-auth-hero-to` | `#EC7E62` | gradiente del panel, fin |
| `--color-auth-input-border` | `#EADFD0` | borde de inputs y tarjeta de invitación |
| `--color-consent-bg` | `#FBF1D6` | panel de autorización de fotos |
| `--color-consent-fg` | `#8A7234` | texto del consentimiento |
| `--color-consent-check` | `#5FB97E` | casilla marcada |
| `--shadow-auth-cta` | `0 10px 22px -8px rgb(238 129 100 / .7)` | CTA de ambas pantallas |
| `--shadow-auth-logo` | `0 12px 26px -10px rgb(238 129 100 / .65)` | tile de logo de `activar-cuenta` |

Medidas de `/login`:

- Contenedor: grid `1.05fr 1fr`, `min-h-dvh`, fondo `auth-bg`.
- Panel coral: gradiente `155deg` `hero-from → hero-mid 45% → hero-to`, flex column `space-between`, `padding 56px 60px`, texto blanco, `overflow hidden`.
- Círculos: 420px `white/12` en `top -140 right -120`; 300px `white/10` en `bottom -110 left -80`.
- Logo: tile 46px radio 14 `white/22`, `SunIcon` 26px, nombre 21px Fredoka 600 `letter-spacing .5px`.
- Titular: 42px/1.12 Fredoka 600, `margin-bottom 18px`; párrafo 17px/1.6 `white/92`, `max-width 430px`; pie 14px `white/90`.
- Columna del formulario: flex centrado, `padding 40px`; contenido `max-width 392px`.
- H2 30px Fredoka 600, `margin-bottom 6px`; subtítulo 15px `muted`, `margin-bottom 28px`.
- Label: 12px 800, `letter-spacing .7px`, `muted`, `margin-bottom 8px`.
- Input: `padding 14px 16px`, radio 14, borde `1.5px auth-input-border`, fondo blanco, 15px ink; `margin-bottom 18px` (email) y `10px` (contraseña).
- "¿Olvidaste tu contraseña?": alineado a la derecha, `margin-bottom 20px`, 13.5px 700 `coral-link`.
- CTA: ancho completo, `padding 15px`, radio 15, gradiente `180deg cta-from → cta-to`, blanco 800 16px, `shadow-auth-cta`.
- Pie: centrado, `margin-top 24px`, 14.5px `muted`; link `coral-link` 800.

Medidas de `/activar-cuenta`:

- Contenedor: flex centrado, `min-h-dvh`, `padding 40px`, contenido `max-width 440px`.
- Tile de logo: 58px radio 18, gradiente `155deg logo-from → coral`, `SunIcon` 30px, `shadow-auth-logo`, `margin-bottom 22px`.
- H1 32px/1.15 Fredoka 600, `margin-bottom 8px`; párrafo 15.5px/1.55 `muted`, `margin-bottom 26px`.
- Tarjeta de invitación: flex gap 14, fondo blanco, borde `1.5px auth-input-border`, radio 16, `padding 14px 16px`, `margin-bottom 22px`; avatar 44px `child-sky`; label 13px `muted`; nombre 17px Fredoka 600.
- Input de código: `padding 14px 16px`, radio 14, 18px 700 Fredoka, `letter-spacing 3px`, `margin-bottom 18px`.
- Consentimiento: flex `align-start` gap 12, fondo `consent-bg`, radio 14, `padding 14px 16px`, `margin-bottom 24px`; casilla 24px radio 8 `consent-check` con check blanco 15px `stroke-width 3`; texto 14px/1.45 `consent-fg`.
- CTA y pie: iguales a `/login`, con `margin-top 22px` en el pie.

## Convenciones de código

Se mantienen las de SPEC 01 y 02: identificadores en inglés, copy en español, named exports, un componente principal por archivo, sin `any`, sin `style={{}}` y sin hex en el JSX.

Específicas de esta spec:

- **Route groups sin cambiar URLs**: `(app)` y `(auth)` no forman parte de la ruta. `proxy.ts` con matcher `/ninos/:id` no se toca.
- **`app/layout.tsx` mínimo**: solo `html`/`body`, fuentes, `metadata` y `globals.css`. El shell es responsabilidad de `app/(app)/layout.tsx`.
- **Un solo `"use client"` nuevo**: `consent-checkbox.tsx`. Las páginas y el resto de componentes de auth son server components.
- **Sin `<form>`**: los inputs son no controlados con `defaultValue`/`placeholder` y los CTAs son `Link`, igual que el mockup.
- **Labels asociados**: `auth-field.tsx` recibe `id` y usa `<label htmlFor>`, porque en este mockup el label visible existe. No se usa `aria-label`.
- **`autoComplete`**: `email` en los emails, `current-password` en login, `new-password` en activación.
- **Datos de la invitación en `_data/auth.ts`**: la página no inventa ni formatea strings; solo compone.
- **Copy literal con voseo** (`Ingresá`, `Publicá`, `Activá`, `tenés`), sin normalizar a tuteo.
- **Sin duplicar el shell**: las páginas de auth no renderizan `AppShell`.

## Implementation plan

1. **Route groups.** Reducir `app/layout.tsx`, crear `app/(app)/layout.tsx` con `AppShell`, mover `page.tsx` y `ninos/` al grupo. Test: `npm run build` verde; `/` mantiene las 3 publicaciones y `/ninos` las 8 tarjetas; `/ninos/no-existe` sigue en 404.
2. **Tokens e icono.** Agregar los tokens a `@theme` y `CheckIcon` a `icons.tsx`. Test: `npm run build` compila y `/` se ve igual.
3. **Datos.** Crear `app/_data/auth.ts` con `Invite` e `invite`. Test: `npx tsc --noEmit` limpio.
4. **Layout y piezas compartidas.** Crear `app/(auth)/layout.tsx`, `auth-logo.tsx`, `auth-field.tsx`, `auth-submit.tsx` y `auth-footer.tsx`. Test: `npx tsc --noEmit` limpio.
5. **Login.** Crear `login-hero.tsx` y `app/(auth)/login/page.tsx` con hero, campos, "¿Olvidaste tu contraseña?" y CTA a `/`. Test: `/login` se ve como el mockup sin el bloque de rol.
6. **Activación.** Crear `invite-summary.tsx`, `consent-checkbox.tsx` y `app/(auth)/activar-cuenta/page.tsx`. Test: `/activar-cuenta` muestra "Mateo · Sala Soles", el código `7K4P9` y el checkbox marcado que alterna al click y con Espacio.
7. **Navegación y responsive.** Conectar "Salir" de la sidebar a `/login`, ocultar el hero bajo `lg` y comparar capturas con Playwright a 1440 y 390. Test: enlaces cruzados funcionan, a 390px no hay scroll horizontal.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` sin errores.
- [x] `npx eslint app` sin errores.
- [x] La consola no muestra errores ni warnings de React en `/login` ni en `/activar-cuenta`.
- [x] `app/` no importa nada de `references/`.
- [x] `/`, `/ninos` y `/ninos/mateo-fernandez` siguen mostrando lo mismo que antes de mover los archivos, y `/ninos/no-existe` sigue devolviendo 404.
- [x] `app/layout.tsx` no renderiza `AppShell`; `app/(app)/layout.tsx` sí.
- [x] `/login` y `/activar-cuenta` no muestran sidebar, barra superior ni el fondo `#F6ECDF` de la app.
- [x] `/login` no muestra "INGRESO COMO" ni los botones "Personal" y "Familia".
- [x] `/login` a 1440px muestra el panel coral y el formulario en dos columnas (`1.05fr 1fr`), con el titular "El día de cada niño, compartido con su familia." y el pie "🌿 Guardería Sala Soles".
- [x] El panel coral usa el gradiente `#F6A98E → #F2937A → #EC7E62` y el fondo de la pantalla es `#FBF4EC`.
- [x] Los campos muestran los labels "EMAIL" y "CONTRASEÑA"; el email viene precargado con `caro@opendaycare.com` y la contraseña es `type="password"` con placeholder `••••••••`.
- [x] "¿Olvidaste tu contraseña?" tiene `href="#"` y no cambia la URL.
- [x] El CTA "Iniciar sesión" navega a `/`.
- [x] El pie "¿Te invitó la guardería? Activá tu cuenta" navega a `/activar-cuenta`.
- [x] `/activar-cuenta` muestra el logo, el titular "Bienvenida a OpenDayCare" y el texto "Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar la cuenta.".
- [x] La tarjeta de invitación muestra la inicial "M" en `#A9D9E8`/`#1F7A93` y el texto "Mateo · Sala Soles".
- [x] El código viene precargado con `7K4P9` en 18px, `letter-spacing 3px` y Fredoka; el email con `lucia.fernandez@gmail.com`; la contraseña con el valor literal `contraseña`.
- [x] El checkbox de autorización arranca marcado, se desmarca y se vuelve a marcar con click, y responde a la barra espaciadora; su `aria-checked` refleja el estado.
- [x] El CTA "Activar mi cuenta" navega a `/` y el pie "¿Ya tenés cuenta? Iniciar sesión" navega a `/login`.
- [x] El botón "Cerrar sesión" de la sidebar navega a `/login`.
- [x] A 390px el panel coral de `/login` no se muestra, el formulario se ve completo y `documentElement.scrollWidth` no supera `innerWidth` en ninguna de las dos pantallas.
- [x] "OpenDayCare", los titulares, el nombre de la invitación y el código se renderizan en Fredoka; el resto en Nunito.
- [x] Capturas de Playwright en `.playwright-mcp/login-1440.png` y `.playwright-mcp/activar-cuenta-1440.png` comparadas contra renders de `login.dc.html` y `activar-cuenta.dc.html`: sin diferencias de layout, color ni tipografía, salvo el bloque de rol eliminado.
- [x] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

## Decisions

- **Sí:** route groups `(app)` y `(auth)`. Es la forma documentada de tener dos shells distintos sin lógica de pathname en el layout raíz ni condicionales por ruta.
- **No:** layout condicional con `usePathname`. Metería navegación en el root layout y perdería el render de servidor del shell.
- **No:** `AppShell` repetido por página. Tres wrappers duplicados hoy y uno más por cada ruta futura.
- **Sí:** `/login` y `/activar-cuenta`. Coinciden con los archivos de referencia y son las URLs que el usuario reconoce.
- **Sí:** CTAs principales a `/`. Es lo que hace el mockup y `/` ya existe; no hay auth real que pueda fallar.
- **Sí:** "Cerrar sesión" de la sidebar apunta a `/login`. La ruta existe y el botón deja de ser decorativo.
- **Sí:** email `caro@opendaycare.com` precargado en login. Fidelidad al mockup; es dato mock y no representa una sesión.
- **Sí:** pantalla estática con `defaultValue` y CTAs como `Link`, sin `<form>`. Es el patrón de SPEC 01/02 y evita un submit que recargue la página con query string.
- **Sí:** el único client component nuevo es el checkbox. La autorización de fotos es lo único que en el mockup se comporta como control real.
- **No:** toggle de mostrar contraseña, validaciones y mensajes de error. UI que la referencia no tiene y que sugiere una auth que no existe.
- **Sí:** ocultar el panel coral bajo `lg`. Es la degradación que ya usa el shell y evita una pantalla de 900px de alto antes del formulario.
- **Sí:** datos de la invitación en `_data/auth.ts`. Consistente con `_data/feed.ts` y `_data/children.ts`; la página solo compone.
- **No:** tono del avatar en los datos. Hay una sola invitación y el color es presentación.
- **Sí:** token `auth-bg` `#FBF4EC` separado de `cream` `#F6ECDF`. El mockup de auth usa un fondo más claro y no conviene repintar la app entera.
- **No:** hex sueltos para el gradiente del hero. Se agregan `auth-hero-from/mid/to` para que el degradado sea reutilizable.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Mover `page.tsx` y `ninos/` puede romper rutas o tipos generados (`LayoutProps<"/">`, `PageProps`) | Después del paso 1, correr `npm run build` y verificar `/`, `/ninos`, `/ninos/[id]` y el 404 por proxy antes de tocar auth. Si faltan tipos, regenerarlos con `npm run dev` una vez. |
| `app/(app)/layout.tsx` recibe `LayoutProps<"/">` porque el grupo no forma parte de la URL | Si el tipo generado no aparece, tipar `children: React.ReactNode` como hace `AppShell`. |
| La fidelidad del login se mide contra un mockup con el bloque de rol | El criterio de captura excluye explícitamente ese bloque; la comparación es sobre hero, campos, CTA y pie. |
| El fondo de auth `#FBF4EC` convive con `body` en `#F6ECDF` | El contenedor de `(auth)` cubre `min-h-dvh` con `auth-bg`; verificar que no asome el cream en los bordes a 390px. |
| El checkbox nativo oculto puede quedar inaccesible si se oculta con `display:none` | Usar `sr-only` (sigue enfocable) y verificar el toggle con Espacio, no solo con click. |

## What is **not** in this spec

- Autenticación real, sesión, cookies y protección de rutas.
- Selector Personal/Familia y cualquier lógica de rol.
- Recuperar contraseña, validaciones y mensajes de error.
- El feed familiar como ruta propia.
- Toggle de contraseña, modo oscuro y tests automatizados.

Cada uno de esos, si llega, va en su propia spec.

## Verification report

**Fecha:** 2026-10-26 · **Branch:** `spec-03-login-y-activacion-de-cuenta` · **Agente:** `spec-verifier`

Punto de partida: árbol limpio sobre el commit `399188c "login-activacion"` (la implementación ya estaba commiteada por el usuario). Durante la corrida se corrigió una desviación de color en 2 archivos de `app/` (ver más abajo); esa corrección quedó **sin commitear**, a decisión del usuario. No se tocó `references/`, `package.json`, ni configuración.

### Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `npm run build` | ✅ exit 0 · `✓ Generating static pages (16/16)` · `/` `○`, `/login` `○`, `/activar-cuenta` `○`, `/ninos` `○`, `/ninos/[id]` `◐` (8 hijos), `ƒ Proxy (Middleware)` registrado. |
| `npx tsc --noEmit` | ✅ exit 0, sin salida. |
| `npx eslint app` | ✅ exit 0, sin salida. (`npm run lint` no se usa como señal: falla por `references/pantallas/support.js`, preexistente.) |
| `grep "references"` en `app/**/*.ts,tsx` | ✅ 0 coincidencias. |
| `grep ": any\|as any\|@ts-ignore\|@ts-expect-error\|style=\{\{"` | ✅ 0 coincidencias. |
| `grep "#[0-9a-fA-F]{3,8}"` en `app/**/*.ts,tsx` | ✅ 0 coincidencias (los hex viven solo en `@theme` de `globals.css`). |
| `grep "export const (dynamic\|revalidate\|fetchCache\|runtime\|dynamicParams)"` | ✅ 0 coincidencias. |
| `grep '"use client"'` | ✅ solo `app/_components/auth/consent-checkbox.tsx`, `children-search.tsx` y `app-sidebar-nav.tsx`. |
| `grep "<form"` en `app/**/*.tsx` | ✅ 0 (convención de la spec: CTAs como `Link`, inputs no controlados). |
| `postcss.config.*` / `tailwind.config.*` en la raíz | ✅ ninguno. |

### Contraste Next.js (Context7 `/vercel/next.js` + docs vendorizadas 16.4.3)

- `docs/01-app/03-api-reference/03-file-conventions/route-groups.md` (16.4.3, en `node_modules/next/dist/docs/`): el nombre del grupo *"should **not be included** in the route's URL path"* → `/login` y `/activar-cuenta` se sirven sin el segmento `(auth)`. Confirmado por el build y por `page.url()` en runtime.
- Mismo documento, *Use cases*: *"Defining multiple root layouts"* / *"Opting specific route segments into sharing a layout, while keeping others out"* → el patrón `(app)` + `(auth)` con `AppShell` solo en el primero es el documentado, no un arreglo artesanal.
- Mismo documento, *Caveats*: el *full page reload* al navegar entre grupos *"only applies to multiple root layouts"*. Como `app/layout.tsx` sigue siendo el root layout único, `(app)/layout.tsx` y `(auth)/layout.tsx` son **nested layouts**: en runtime se observó que Next conserva el árbol anterior montado con `display: none` (no hay reload). Implicancia práctica para verificar: la sidebar hay que medirla con `checkVisibility()`, no con `count()` de `aside`.
- Context7 (`/vercel/next.js`, `docs/…/route-groups.mdx` + `01-getting-started/02-project-structure.mdx`): *"The root layout in app/layout.tsx wraps all groups, while group-level layout.tsx files apply only to their group"* → coherente con `LayoutProps<"/">` en ambos layouts de grupo; el build valida los tipos generados.
- Fuentes por `next/font/google` en el root layout (sin `<link>` a Google), sin configs de ruta prohibidas: convención del repo cumplida.

### Criterios de aceptación (26/26 PASS)

Evidencia runtime: Playwright, dev `:3000`, viewport 1440×900 salvo donde se indique.

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `npm run build` sin errores | PASS | exit 0, 16/16 páginas, `/login` y `/activar-cuenta` `○` estáticas. |
| 2 | `npx tsc --noEmit` sin errores | PASS | exit 0, sin salida. |
| 3 | `npx eslint app` sin errores | PASS | exit 0, sin salida. |
| 4 | Consola sin errores ni warnings en ambas pantallas | PASS | `page.on('console')` + `browser_console_messages(level:warning)`: 0 errores / 0 warnings en `/login` y `/activar-cuenta` (carga fresca con hidratación completa; ver *Artefacto de Playwright* abajo). |
| 5 | `app/` no importa `references/` | PASS | grep: 0 coincidencias. |
| 6 | Regresión de `/`, `/ninos`, perfil y 404 | PASS | `/`: 3 `article`, saludo "Buenas, Caro", `aside` visible, `aria-current="page"` en Feed. `/ninos`: 8 tarjetas, "8 niños", buscador presente. `/ninos/mateo-fernandez`: h1 "Mateo Fernández", "Alergias y notas", "Lucía Fernández". `/ninos/no-existe` → **404** (`page.request.get`). `/login` y `/activar-cuenta` → 200. |
| 7 | Root layout sin `AppShell`; `(app)/layout.tsx` con `AppShell` | PASS | grep `AppShell` solo en `app/(app)/layout.tsx:1` y `:4`; `app/layout.tsx` renderiza `{children}` directo en `body`. |
| 8 | Auth sin sidebar, barra superior ni fondo crema | PASS | `aside`/`header`/`main` **ausentes del DOM** en carga fresca; tras navegar client-side desde `/` (Salir) el `aside` queda con `checkVisibility() === false`. `elementFromPoint` en 4 puntos devuelve el wrapper `bg-auth-bg` `rgb(251,244,236)` cubriendo 1440×900; elementos `bg-cream` visibles: 0. |
| 9 | Sin "INGRESO COMO" ni botones Personal/Familia | PASS | `document.querySelectorAll('button')` → `[]`; `"INGRESO COMO"` ausente del `innerText`. |
| 10 | Dos columnas `1.05fr 1fr` + titular + pie del hero | PASS | `gridTemplateColumns: "737.547px 702.453px"` (ratio 1.0500); h1 `"El día de cada niño,\ncompartido con su familia."`; "🌿 Guardería Sala Soles" presente. |
| 11 | Gradiente del panel y fondo `#FBF4EC` | PASS | `linear-gradient(155deg, rgb(246,169,142), rgb(242,147,122) 45%, rgb(236,126,98))` = `#F6A98E → #F2937A → #EC7E62`; wrapper `rgb(251,244,236)` = `#FBF4EC`; padding del panel `56px 60px`, `justify-content: space-between`. |
| 12 | Labels EMAIL/CONTRASEÑA, email precargado, password con placeholder | PASS | `labels = ["EMAIL","CONTRASEÑA"]`; email `type=email` value `caro@opendaycare.com`, radio 14px, padding `14px 16px`, 15px, borde `rgb(234,223,208)`; password `type=password` placeholder `••••••••` value vacío. |
| 13 | "¿Olvidaste tu contraseña?" inerte | PASS | `href="#"`; tras click, `location.href` sigue `http://localhost:3000/login` (ni se agrega el hash). |
| 14 | CTA "Iniciar sesión" → `/` | PASS | click → `page.url() === "http://localhost:3000/"`. |
| 15 | Pie de login → `/activar-cuenta` | PASS | link "Activá tu cuenta" `href=/activar-cuenta`; click navega. |
| 16 | `/activar-cuenta`: logo, titular y subtítulo | PASS | h1 "Bienvenida a OpenDayCare" (Fredoka 32px/36.8px 600); subtítulo literal presente; tile 58px radio 18, gradiente `155deg rgb(248,195,168)→rgb(242,147,122)`, sombra `rgba(238,129,100,.65) 0 12px 26px -10px`, `margin-bottom 22px`. |
| 17 | Tarjeta de invitación | PASS | avatar 44px `bg rgb(169,217,232)` / `color rgb(31,122,147)` = `#A9D9E8`/`#1F7A93`, Fredoka 19px 600; texto "Mateo · Sala Soles"; tarjeta blanca, borde `rgb(234,223,208)`, radio 16, padding `14px 16px`, gap 14. |
| 18 | Código, email y contraseña precargados | PASS | code value `7K4P9`, `fontFamily Fredoka`, `18px`, `700`, `letter-spacing 3px`; email `lucia.fernandez@gmail.com`; password value `contraseña`, borde `rgb(242,167,142)`. |
| 19 | Checkbox marcado, toggle con click y Espacio, `aria-checked` | PASS | inicial `checked=true` `aria-checked="true"` → click → `false`/`"false"` (check ausente, caja transparente con borde verde) → `Space` sobre el input → `true`/`"true"` (fondo `rgb(95,185,126)`). El input está enfocable (`sr-only`, no `display:none`): `document.activeElement` es el checkbox. |
| 20 | CTA "Activar mi cuenta" → `/` y pie → `/login` | PASS | click CTA → `http://localhost:3000/`; link "Iniciar sesión" → `/login`. |
| 21 | "Cerrar sesión" de la sidebar → `/login` | PASS | `getByTitle('Cerrar sesión')` click → `page.url()` termina en `/login`. |
| 22 | 390px: hero oculto, formulario completo, sin scroll horizontal | PASS | `/login` 390: `scrollWidth 390 = innerWidth 390`, hero `display: none`, 2/2 inputs visibles, CTA visible (342px), 0 elementos fuera del viewport. `/activar-cuenta` 390: `scrollWidth 380 ≤ 390`, 4/4 inputs visibles, CTA visible, 0 overflow. `bg-cream` visible: 0 en ambas. |
| 23 | Fredoka en marca/titulares/nombre/código; Nunito en el resto | PASS | Fredoka: marca 21px 600, h1 hero 42px/600, h1 login 30px/600, "Mateo · Sala Soles" 17px/600, código 18px. Nunito: labels 12px 800, subtítulos 15px/15.5px, link "¿Olvidaste…?" 13.5px, pies 14.5px, inputs, CTA 16px 800. `document.fonts.check('600 42px Fredoka')` y `('400 15px Nunito')` → `true`. |
| 24 | Capturas vs mockups sin diferencias (salvo el bloque de rol) | PASS | Ver tabla de paridad abajo. |
| 25 | Identificadores en inglés | PASS | `LoginPage`, `ActivateAccountPage`, `AuthField/AuthLogo/AuthSubmit/AuthFooter/InviteSummary/LoginHero/ConsentCheckbox`, tipos `AuthFieldVariant`/`AuthLogoVariant`/`Invite`, consts `VARIANT_STYLES`/`LOGO_STYLES`/`invite`, ids `login-email`/`activation-code`, nombres `email`/`password`/`invitationCode`/`photo-consent`. Escaneo de raíces en español como identificador: 0 coincidencias (el español solo está en copy y tokens de color). |
| 26 | Sin `any`, `@ts-ignore`, `style={{}}` ni hex en JSX | PASS | greps: 0 coincidencias; hex solo en `@theme` de `globals.css`. |

### Paridad numérica con los mockups (criterio 24)

Mockups renderizados vía `http://127.0.0.1:8971` (servidor de solo lectura sobre `references/pantallas/`), mismo viewport 1440×900.

| Medida | App | Mockup |
| --- | --- | --- |
| Grid `/login` | `737.547px 702.453px` | `737.547px 702.453px` |
| Ancho del panel coral | 738px | 738px |
| Padding del panel | `56px 60px` | `56px 60px` |
| h1 del hero | 42px/47.04px | 42px/47.04px |
| Borde del input (decl. 1.5px) | `1px rgb(234,223,208)` | `1px rgb(234,223,208)` (Chromium cuantiza a 1px a DPR 1, igual que en SPEC 01) |
| Radio / padding del input | 14px / `14px 16px` | 14px / `14px 16px` |
| Altura del CTA | 52px, radio 15 | 52px, radio 15 |
| Campo de código | Fredoka 18px, `letter-spacing 3px` | Fredoka 18px, `3px` |
| Borde del campo resaltado | `rgb(242,167,142)` | `rgb(242,167,142)` |
| Ancho del texto "Bienvenida a OpenDayCare" | 391.44px | 391.44px (**diff 0**) |
| Posiciones `/activar-cuenta` (logo, h1, tarjeta, código, consentimiento, CTA, pie) | 69 / 149 / 268 / 388 / 642 / 735 / 811 | 70 / 150 / 269 / 389 / 643 / 736 / 810 (±1px) |

Diferencias reales y explicadas:

1. **Bloque de rol eliminado** (decisión de la spec): al ser el formulario una columna centrada, todo el bloque queda ~47px más abajo que en el mockup. No es una diferencia de layout, es consecuencia del contenido removido.
2. **Labels a 800 vs 700 del mockup**: lo fija la sección *Tokens y medidas* de esta spec (`Label: 12px 800`) y es la convención del repo (`font-extrabold` en eyebrows de SPEC 01/02). Mismo tamaño, tracking y color; no se corrigió para no contradecir el spec.

### Correcciones aplicadas en esta corrida

- **`app/globals.css`**: agregado el token `--color-auth-input-active: #f2a78e`.
- **`app/_components/auth/auth-field.tsx`**: el estado `highlighted` usaba `border-coral` (`#F2937A`); ahora usa `border-auth-input-active` (`#F2A78E`), el valor exacto del mockup en el campo "CREAR CONTRASEÑA". Medido antes: `rgb(242,147,122)`; después: `rgb(242,167,142)` = mockup.
- Tras la corrección se re-ejecutaron `npm run build`, `npx tsc --noEmit` y `npx eslint app`: los tres en verde.
- Nota de documentación: el token nuevo no estaba en la tabla *Tokens y medidas*; queda registrado acá en vez de editar la tabla del spec.

### Artefactos (en `.playwright-mcp/`, gitignored)

- `login-1440.png` — `/login` de la app, 1440×900 (criterio 24).
- `activar-cuenta-1440.png` — `/activar-cuenta` de la app (criterio 24).
- `mock-login-1440.png` — render de `references/pantallas/login.dc.html`.
- `mock-activar-cuenta-1440.png` — render de `references/pantallas/activar-cuenta.dc.html`.
- `login-390.png`, `activar-cuenta-390.png` — evidencia responsive (criterio 22).
- `serve-refs.mjs` — servidor de solo lectura de `references/pantallas` usado para los renders de comparación.

### Artefacto de Playwright a tener en cuenta

Si una captura se toma **durante** la hidratación, Playwright inyecta `style="caret-color: transparent"` en los `<input>` y React lo reporta como *hydration mismatch* (error en consola). No es código del producto: esperando a que termine la hidratación y capturando después, la consola queda en 0 errores / 0 warnings y el atributo `style` de los inputs queda vacío (medido en las dos pantallas). El mismo efecto ya se documentó en SPEC 01 y 02.

Para medir la ausencia de shell tras una navegación client-side hay que usar `checkVisibility()`: Next deja el árbol del grupo anterior montado con `display: none` (nested layouts, no múltiples root layouts). Un `count()` de `aside` daría falso positivo.

### Archivos modificados en esta corrida

- `specs/03-login-y-activacion-de-cuenta.md`: 26 casillas marcadas + esta sección.
- `app/globals.css` y `app/_components/auth/auth-field.tsx`: corrección del color del campo resaltado (sin commitear).

### Pendientes y riesgos

- Nada pendiente de verificación: 26/26 verificados con evidencia.
- Queda sin commitear la corrección del borde (`app/globals.css`, `auth-field.tsx`); el commit es decisión del usuario.
- Con todo en PASS corresponde pasar `**Status:**` de `Aprovado` a `Implementado`. Ese cambio lo hace el usuario (o se pide explícitamente).
- El dev server de `:3000` y el servidor de referencias de `:8971` quedaron **detenidos** al cerrar la corrida; el navegador está cerrado.
- `app/layout.tsx` ya no monta el shell: cualquier ruta futura que necesite sidebar debe vivir bajo `app/(app)/`. Vale la pena repetirlo en la próxima spec para no olvidarlo.
