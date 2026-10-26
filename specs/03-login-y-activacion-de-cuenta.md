# SPEC 03 — Login y activación de cuenta

> **Status:** Aprovado
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

- [ ] `npm run build` termina sin errores.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npx eslint app` sin errores.
- [ ] La consola no muestra errores ni warnings de React en `/login` ni en `/activar-cuenta`.
- [ ] `app/` no importa nada de `references/`.
- [ ] `/`, `/ninos` y `/ninos/mateo-fernandez` siguen mostrando lo mismo que antes de mover los archivos, y `/ninos/no-existe` sigue devolviendo 404.
- [ ] `app/layout.tsx` no renderiza `AppShell`; `app/(app)/layout.tsx` sí.
- [ ] `/login` y `/activar-cuenta` no muestran sidebar, barra superior ni el fondo `#F6ECDF` de la app.
- [ ] `/login` no muestra "INGRESO COMO" ni los botones "Personal" y "Familia".
- [ ] `/login` a 1440px muestra el panel coral y el formulario en dos columnas (`1.05fr 1fr`), con el titular "El día de cada niño, compartido con su familia." y el pie "🌿 Guardería Sala Soles".
- [ ] El panel coral usa el gradiente `#F6A98E → #F2937A → #EC7E62` y el fondo de la pantalla es `#FBF4EC`.
- [ ] Los campos muestran los labels "EMAIL" y "CONTRASEÑA"; el email viene precargado con `caro@opendaycare.com` y la contraseña es `type="password"` con placeholder `••••••••`.
- [ ] "¿Olvidaste tu contraseña?" tiene `href="#"` y no cambia la URL.
- [ ] El CTA "Iniciar sesión" navega a `/`.
- [ ] El pie "¿Te invitó la guardería? Activá tu cuenta" navega a `/activar-cuenta`.
- [ ] `/activar-cuenta` muestra el logo, el titular "Bienvenida a OpenDayCare" y el texto "Te invitaron a seguir el día de tu hijo. Creá tu contraseña para activar la cuenta.".
- [ ] La tarjeta de invitación muestra la inicial "M" en `#A9D9E8`/`#1F7A93` y el texto "Mateo · Sala Soles".
- [ ] El código viene precargado con `7K4P9` en 18px, `letter-spacing 3px` y Fredoka; el email con `lucia.fernandez@gmail.com`; la contraseña con el valor literal `contraseña`.
- [ ] El checkbox de autorización arranca marcado, se desmarca y se vuelve a marcar con click, y responde a la barra espaciadora; su `aria-checked` refleja el estado.
- [ ] El CTA "Activar mi cuenta" navega a `/` y el pie "¿Ya tenés cuenta? Iniciar sesión" navega a `/login`.
- [ ] El botón "Cerrar sesión" de la sidebar navega a `/login`.
- [ ] A 390px el panel coral de `/login` no se muestra, el formulario se ve completo y `documentElement.scrollWidth` no supera `innerWidth` en ninguna de las dos pantallas.
- [ ] "OpenDayCare", los titulares, el nombre de la invitación y el código se renderizan en Fredoka; el resto en Nunito.
- [ ] Capturas de Playwright en `.playwright-mcp/login-1440.png` y `.playwright-mcp/activar-cuenta-1440.png` comparadas contra renders de `login.dc.html` y `activar-cuenta.dc.html`: sin diferencias de layout, color ni tipografía, salvo el bloque de rol eliminado.
- [ ] Ningún identificador nuevo está en español: ni archivos, ni componentes, ni tipos, ni campos, ni variables, ni funciones.
- [ ] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.

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
