# SPEC 13 — Proveedores de correo: Resend y Mailtrap en desarrollo, SMTP propio en producción

> **Status:** Aprovado
> **Depends on:** SPEC 11
> **Date:** 2026-10-28
> **Objective:** Enviar la invitación de padres por un módulo de correo que en desarrollo elige Resend o Mailtrap Sandbox y en producción usa el SMTP del propio servidor, todo configurado por variables de entorno.

## Por qué existe esta spec

- SPEC 11 dejó el envío acoplado a la API de Resend en `app/_lib/email/resend.ts`: el proveedor, el remitente y la key están hardcodeados en la forma del módulo.
- `invite-actions.ts` solo distingue `ok` de `!ok`, así que cambiar el transporte no debe tocar la UI ni los mensajes.
- No hay forma de probar el correo sin una cuenta de Resend ni de enviar desde el servidor propio en producción.
- Mailtrap Sandbox permite capturar los correos en desarrollo sin dominio verificado ni entregas reales; SMTP propio es lo que pide producción.

## Estado actual verificado (2026-10-28)

- `app/_lib/email/resend.ts` (49 líneas) es el único emisor. `sendInvitationEmail` tiene un solo consumidor: `app/(app)/(staff)/ninos/invite-actions.ts:200`.
- `app/_lib/email/invitation-email.ts` es puro (asunto + HTML) y no depende del proveedor; no se toca.
- `package.json`: `resend@^6.34.1` instalado, `nodemailer` no existe.
- `.env.template` declara `RESEND_API_KEY` y `RESEND_FROM_EMAIL`; `README.md:8` dice "Emails: Resend" y la tabla de variables está en las líneas 52-56.
- Contrato actual: `SendInvitationResult = { ok: true } | { ok: false; reason: "config" | "provider" }`. El tipo no se importa en ningún otro archivo.
- No hay otros correos en la app ni plantillas de Supabase Auth en el código.

## Scope

**In:**

- `package.json` / `package-lock.json`: `nodemailer@^10.2.1` y `@types/nodemailer@^8.0.2` (dev). `resend` se mantiene.
- `.env.template`: `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`; bloque `MAILTRAP_HOST/PORT/USER/PASSWORD`; bloque `SMTP_HOST/PORT/USER/PASSWORD`. Se elimina `RESEND_FROM_EMAIL`.
- `app/_lib/email/config.ts`: tipos `EmailProvider`, `EmailConfig` y `resolveEmailConfig()` puro; resuelve defaults, valida pares de credenciales y aplica la guarda por entorno.
- `app/_lib/email/send-email.ts`: `sendEmail({ to, subject, html, text? })` elige transporte, aplica timeout de 10 s y normaliza el resultado.
- `app/_lib/email/transports/resend.ts`: `sendWithResend(config, input)`.
- `app/_lib/email/transports/smtp.ts`: `sendWithSmtp(config, input)`, compartido por `mailtrap` y `smtp`.
- `app/_lib/email/invitation.ts`: `sendInvitationEmail(...)` como wrapper que arma asunto/HTML y delega en `sendEmail`.
- `app/_lib/email/resend.ts`: se elimina.
- `app/(app)/(staff)/ninos/invite-actions.ts`: solo cambia el import a `@/app/_lib/email/invitation`.
- `.env.local`: el usuario pega las credenciales reales (gitignored, no se commitea).
- `README.md`: encabezado actualizado y sección **Correo: Resend, Mailtrap y SMTP** con la matriz entorno → proveedor → variables.
- Degradación: la UI del modal no cambia; el error de envío sigue siendo el mismo mensaje inline y `sent_at` sigue escribiéndose solo tras un envío aceptado.

**Out of scope (para specs futuras):**

- Reintentos automáticos, cola, idempotency keys y webhooks de rebote o queja.
- Adjuntos, CC/BCC, múltiples destinatarios y correos nuevos.
- Plantillas de Supabase Auth (confirmación, recuperación) y su SMTP.
- Verificación de dominio, SPF, DKIM, DMARC y reputación del servidor propio.
- Un transporte `console`/`json` para desarrollo sin proveedor.
- Selector de proveedor en la UI o en runtime (es solo entorno).
- Tests automatizados más allá de build, SQL y Playwright.

## Data model

No hay cambios de base de datos. El "modelo" son las variables de entorno y los tipos del módulo.

### Variables de entorno

```dotenv
# Proveedor: resend | mailtrap | smtp
# Desarrollo: resend o mailtrap. Producción: solo smtp (obligatorio).
EMAIL_PROVIDER=resend

# Remitente. Obligatorio con mailtrap y smtp.
# Con resend, si falta, se usa "OpenDayCare <onboarding@resend.dev>".
EMAIL_FROM=OpenDayCare <no-reply@tudominio.com>

# Resend (desarrollo)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Mailtrap Email Sandbox (desarrollo) — Settings → SMTP Settings del inbox
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=xxxxxxxxxxxx
MAILTRAP_PASSWORD=xxxxxxxxxxxx

# SMTP del propio servidor (producción)
# Dejar SMTP_USER y SMTP_PASSWORD vacíos para conexión anónima (localhost:25).
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_USER=
SMTP_PASSWORD=
```

Reglas de resolución:

| Variable | `resend` | `mailtrap` | `smtp` |
| --- | --- | --- | --- |
| `EMAIL_FROM` | opcional (`onboarding@resend.dev`) | obligatorio | obligatorio |
| `RESEND_API_KEY` | obligatorio | — | — |
| `MAILTRAP_HOST` / `MAILTRAP_USER` / `MAILTRAP_PASSWORD` | — | obligatorios | — |
| `MAILTRAP_PORT` | — | default `2525` | — |
| `SMTP_HOST` | — | — | obligatorio |
| `SMTP_PORT` | — | — | default `25` |
| `SMTP_USER` + `SMTP_PASSWORD` | — | — | opcionales, siempre en par |

- Todos los valores se leen con `trim()`; string vacío equivale a ausente (importante para `SMTP_USER=` en `.env.local`).
- `secure` no se configura: se deriva como `port === 465` en ambos transportes SMTP. 2525/587 usan STARTTLS, 465 usa TLS directo. Menos variables y sin pares contradictorios.
- `EMAIL_PROVIDER` nunca lleva prefijo `NEXT_PUBLIC_`: es server-only.

### Tipos

```ts
// app/_lib/email/config.ts
export type EmailProvider = "resend" | "mailtrap" | "smtp";

type BaseConfig = { from: string; timeoutMs: number };

export type EmailConfig =
  | (BaseConfig & { provider: "resend"; apiKey: string })
  | (BaseConfig & {
      provider: "mailtrap";
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
    })
  | (BaseConfig & {
      provider: "smtp";
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; password: string };
    });

export type ResolveEmailConfigResult =
  | { ok: true; config: EmailConfig }
  | { ok: false; reason: "config"; detail: string };

export function resolveEmailConfig(): ResolveEmailConfigResult;
```

```ts
// app/_lib/email/send-email.ts
export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "config" | "provider" | "timeout" };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
```

```ts
// app/_lib/email/invitation.ts
import type { InvitationEmailInput } from "@/app/_lib/email/invitation-email";

type SendInvitationParams = InvitationEmailInput & { to: string };

export async function sendInvitationEmail(
  params: SendInvitationParams,
): Promise<SendEmailResult>;
```

- `EMAIL_SEND_TIMEOUT_MS = 10_000` es una constante del módulo, no una variable de entorno.
- `invitation-email.ts` no cambia: sigue exportando `buildInvitationEmailSubject` y `buildInvitationEmailHtml`.

### Guarda por entorno

| `NODE_ENV` | `EMAIL_PROVIDER` | Resultado |
| --- | --- | --- |
| `development` | ausente | `resend` |
| `development` | `resend` / `mailtrap` / `smtp` | se acepta |
| `production` | ausente | `{ ok: false, reason: "config" }` |
| `production` | `smtp` | se acepta |
| `production` | `resend` / `mailtrap` | `{ ok: false, reason: "config" }` |
| cualquiera | otro valor | `{ ok: false, reason: "config" }` |

- La resolución ocurre **dentro de `sendEmail`**, nunca al importar el módulo. `next build` corre con `NODE_ENV=production` y un módulo que valide en el top-level rompería el build (lección de SPEC 11 con `new Resend(undefined)`).
- En producción, `reason: "config"` y `reason: "provider"` producen el mismo mensaje inline; el detalle real va al log del servidor.

## Convenciones de código

Se mantienen las de SPEC 01–12: identificadores en inglés, copy en español con voseo, named exports, sin `any`, sin `style={{}}` ni hex en JSX, server components por defecto.

Específicas de esta spec:

- **Los cuatro módulos nuevos llevan `import "server-only"`** (`config.ts`, `send-email.ts`, `invitation.ts` y los dos transports). Ninguno puede llegar a un cliente.
- **El transporte se construye por envío, no en el top-level.** `new Resend(apiKey)` y `nodemailer.createTransport(...)` van dentro de la función; un singleton de módulo captura `undefined` en build.
- **Un solo punto de logging.** `send-email.ts` registra `console.error("Email send failed", { provider, reason, detail })`; nunca loguea `apiKey`, `user`, `password` ni el HTML.
- **`nodemailer` y `resend` solo se importan desde `transports/`.** Ningún otro archivo de `app/` los importa.
- **El timeout es un `Promise.race` con timer cancelado en `finally`.** En nodemailer además se pasan `connectionTimeout`, `greetingTimeout` y `socketTimeout` iguales a `timeoutMs`.
- **Un warning, no un fallback, para `RESEND_FROM_EMAIL`.** Si la variable sigue presente y `EMAIL_FROM` no, se loguea una advertencia pidiendo renombrarla; no se usa su valor.
- **Sin cambios de UI.** No se agregan componentes cliente, rutas ni copy.

## Implementación

1. **Dependencias.** `npm install nodemailer@^10.2.1` y `npm install -D @types/nodemailer@^8.0.2`; `resend` se queda. Test: `npm run build` y `npx tsc --noEmit` pasan sin consumidores nuevos.
2. **Configuración.** Crear `app/_lib/email/config.ts` con `resolveEmailConfig()`, defaults, validación de pares y guarda por entorno. Sin consumidores todavía. Test: `npx tsc --noEmit` limpio y `next build` no falla con `NODE_ENV=production` (la resolución no corre al importar).
3. **Transportes y primitivo.** Crear `transports/resend.ts`, `transports/smtp.ts` y `send-email.ts` con timeout y log. Test: `npm run build`; un envío de prueba no es posible aún sin wrapper.
4. **Wrapper y cableado.** Crear `invitation.ts`, borrar `app/_lib/email/resend.ts` y cambiar el import de `invite-actions.ts`. Test: con `EMAIL_PROVIDER=resend` y la key actual, invitar a un niño desde `/ninos` sigue enviando y escribiendo `sent_at`, igual que SPEC 11.
5. **Entorno y documentación.** Reescribir el bloque de correo de `.env.template`, actualizar el encabezado y la tabla de `README.md`, agregar la sección **Correo: Resend, Mailtrap y SMTP**, y pedirle al usuario que cargue `EMAIL_FROM` y las credenciales en `.env.local`. Test: `git check-ignore .env.local` y `git status` sin `.env*`.
6. **Matriz de desarrollo.** Verificar `EMAIL_PROVIDER=mailtrap` con las credenciales reales del sandbox y `EMAIL_PROVIDER` ausente con Resend. Test: el correo aparece en la bandeja de Mailtrap con asunto, código y enlace; `invitations.sent_at` no es nulo.
7. **Matriz de producción.** Con `npm run build` + `npm start`: `EMAIL_PROVIDER=smtp` apuntando al sandbox de Mailtrap envía correctamente, y `EMAIL_PROVIDER=mailtrap|resend` y ausente devuelven error de configuración sin enviar. Test: el criterio de guarda y `sent_at` nulo.
8. **Cierre.** `npm run build`, `npx tsc --noEmit`, `npx eslint app`, greps de imports y variables; limpiar `.env.local` de credenciales temporales y no dejar artefactos fuera de `.playwright-mcp/`.

## Acceptance criteria

- [x] `npm run build`, `npx tsc --noEmit` y `npx eslint app` terminan sin errores.
- [x] `package.json` incluye `nodemailer` `^10.2.1` y `@types/nodemailer` `^8.0.2` en `devDependencies`; `resend` sigue presente.
- [x] `app/_lib/email/` contiene `config.ts`, `send-email.ts`, `invitation.ts`, `invitation-email.ts`, `transports/resend.ts` y `transports/smtp.ts`; `resend.ts` ya no existe.
- [x] Solo `transports/resend.ts` importa `resend` y solo `transports/smtp.ts` importa `nodemailer`.
- [x] `invite-actions.ts` importa `sendInvitationEmail` desde `@/app/_lib/email/invitation` y no hay otras referencias al módulo borrado.
- [x] Los cinco módulos nuevos importan `server-only`; ningún archivo con `"use client"` los importa.
- [x] En desarrollo, sin `EMAIL_PROVIDER`, una invitación se envía por Resend y escribe `sent_at` (comportamiento de SPEC 11 intacto).
- [x] Con `EMAIL_PROVIDER=mailtrap`, `MAILTRAP_HOST/PORT/USER/PASSWORD` y `EMAIL_FROM`, la invitación aparece en la bandeja del sandbox con asunto `Invitación para seguir a {nombre} en OpenDayCare`, el código de 5 caracteres y el enlace `/activar-cuenta?code=`, y `sent_at` queda escrito.
- [x] Con `EMAIL_PROVIDER=smtp` bajo `npm start` (NODE_ENV=production) y `SMTP_*` apuntando al sandbox, el correo llega: el transporte de producción funciona.
- [x] Bajo `npm start`, `EMAIL_PROVIDER=mailtrap` y `EMAIL_PROVIDER=resend` muestran "No pudimos enviar la invitación. Intentá de nuevo en unos minutos.", loguean el motivo de configuración, no envían nada y dejan `sent_at` nulo.
- [x] Bajo `npm start`, sin `EMAIL_PROVIDER`, el envío falla por configuración y no se intenta ninguna conexión.
- [x] Con `EMAIL_PROVIDER=mailtrap` y `MAILTRAP_PASSWORD` vacía, el envío falla por configuración sin llamada de red.
- [x] Con `EMAIL_PROVIDER=mailtrap|smtp` y `EMAIL_FROM` vacía, el envío falla por configuración; con `resend` y `EMAIL_FROM` vacía se usa `onboarding@resend.dev`.
- [x] Con `EMAIL_PROVIDER=smtp`, `SMTP_USER` presente y `SMTP_PASSWORD` vacío, el envío falla por configuración; con ambos vacíos se intenta conexión anónima.
- [x] Con `EMAIL_PROVIDER=smtp`, `SMTP_HOST=10.255.255.1` y `SMTP_PORT=25`, el envío devuelve `timeout` en 10–12 s, se muestra el mensaje inline, `sent_at` sigue nulo y no hay unhandled rejection.
- [x] `EMAIL_PROVIDER` con un valor desconocido falla por configuración en desarrollo y en producción.
- [x] `MAILTRAP_PORT=465` usa TLS directo y `MAILTRAP_PORT=2525` usa STARTTLS (verificado en el log de nodemailer o en la llegada del correo).
- [x] `.env.template` lista las 11 variables con placeholders y comentarios, sin valores reales, y `EMAIL_PROVIDER` no está prefijada con `NEXT_PUBLIC_`.
- [x] `README.md` describe el encabezado de correo, la matriz entorno → proveedor, cómo obtener las credenciales del sandbox y que producción solo acepta `smtp`.
- [x] `grep "RESEND_FROM_EMAIL" .env.template` devuelve 0 coincidencias y ningún módulo de `app/` lee su valor funcionalmente: la única referencia es el warning de deprecación de `send-email.ts`, y el README solo documenta el renombrado.
- [x] El log de error de un envío fallido incluye proveedor y motivo, y no incluye `apiKey`, `user`, `password` ni el HTML del correo.
- [x] No aparecen rutas nuevas, archivos con `"use client"` nuevos ni cambios de copy en el modal; los criterios 14–21 de SPEC 11 siguen pasando.
- [x] Si Turbopack no resuelve `nodemailer`, `next.config.ts` agrega `serverExternalPackages: ["nodemailer"]` y el build pasa; sin ese fallo, no se toca la configuración.

## Decisions

- **Sí:** un solo `EMAIL_PROVIDER` con guarda por entorno. Es explícito, portable y evita que un `mailtrap` olvidado capture correos en producción.
- **Sí:** Mailtrap Sandbox por SMTP. Reutiliza el mismo adaptador que producción y se configura con las credenciales que Mailtrap muestra en el inbox.
- **Sí:** `MAILTRAP_*` y `SMTP_*` separadas. Cambiar `EMAIL_PROVIDER` no obliga a reescribir credenciales ni a comentar bloques.
- **Sí:** un primitivo `sendEmail()` y `sendInvitationEmail()` encima. El próximo correo no necesita otro transporte.
- **Sí:** `EMAIL_FROM` único y se elimina `RESEND_FROM_EMAIL`. Un solo remitente por entorno; el default `onboarding@resend.dev` queda solo para `resend`, donde es válido.
- **Sí:** default `resend` en desarrollo. Conserva el comportamiento actual y no obliga a configurar nada para seguir trabajando.
- **Sí:** error de configuración si falta `EMAIL_PROVIDER` en producción. Un default silencioso ahí es un correo que nunca llega.
- **Sí:** `secure` derivado de `port === 465`. Elimina una variable y el par contradictorio `port: 587, secure: true`.
- **Sí:** auth opcional en `smtp` y siempre en par. Cubre el servidor propio con credenciales y el Postfix local en `127.0.0.1:25`.
- **Sí:** timeout de 10 s como constante. El modal ya permite reintentar y un valor configurable solo agrega una forma de romper el envío.
- **No:** reintentos automáticos. Duplican correos y alargan el modal hasta 30 s.
- **No:** transporte `console`. No fue pedido y Mailtrap ya cumple el rol de bandeja de pruebas.
- **No:** `MAILTRAP_SECURE` / `SMTP_SECURE`. Se derivan del puerto.
- **No:** fallback a `RESEND_FROM_EMAIL`. Solo un warning de renombrado; mantener dos nombres para el mismo dato es deuda.
- **Sí:** el control de `RESEND_FROM_EMAIL` excluye el warning y su documentación. Exigir 0 coincidencias en `app/` y `README.md` haría imposible avisar del renombrado; se controla que `.env.template` no lo declare y que nadie lea su valor.
- **No:** validar en el top-level del módulo. `next build` corre en producción y rompería.
- **No:** tocar `invitation-email.ts` ni la UI. El cambio es de transporte, no de contenido.
- **No:** `service_role`, base de datos ni migraciones. Esta spec no toca Supabase.

## Risks

| Risk | Mitigation |
| --- | --- |
| Un deploy con `NODE_ENV` distinto de `production` (staging con `next dev`) deja `mailtrap` activo y captura correos reales | La guarda cubre producción; el README lo advierte y cada envío con `mailtrap` puede loguear `provider=mailtrap` para detectarlo en staging |
| El timeout de Resend es blando: `Promise.race` no aborta el HTTP y el correo puede haber salido | Sin reintentos automáticos; el flujo reutiliza la pendiente con `sent_at = null`, y el usuario ve el error y decide reintentar |
| `nodemailer` no resuelve bajo Turbopack | Criterio explícito: si falla el build, `serverExternalPackages: ["nodemailer"]`; si no falla, no se agrega |
| El servidor SMTP propio no tiene SPF/DKIM/PTR y los correos caen en spam | Fuera de alcance por decisión; el README lo señala como requisito de operación, no de código |
| Credenciales de Mailtrap o SMTP terminan en un log | El log de `send-email.ts` solo incluye proveedor y motivo; los transports nunca imprimen el objeto de configuración |
| `.env.local` conserva `RESEND_FROM_EMAIL` y el remitente esperado cambia | Warning en el primer envío pidiendo renombrar a `EMAIL_FROM`; el criterio exige 0 coincidencias en el repo |
| `SMTP_USER=` vacío se interpreta como usuario válido y el servidor rechaza la autenticación | `trim()` + par obligatorio: usuario vacío equivale a conexión anónima |
| Dos transportes con formas de error distintas (`{ error }` de Resend y excepción de nodemailer) | `send-email.ts` es el único que traduce a `SendEmailResult`; los transports devuelven el mismo contrato |

## What is **not** in this spec

- Reintentos, cola de envío, idempotency keys y webhooks de rebote.
- Adjuntos, CC/BCC, múltiples destinatarios y correos nuevos.
- Plantillas de Supabase Auth y su SMTP.
- SPF, DKIM, DMARC y reputación del servidor propio.
- Transporte `console` y selector de proveedor en la UI.
- Tests automatizados más allá de build, SQL y Playwright.

## Verification report

**Fecha:** 2026-10-28 · **Branch:** `spec-13-proveedores-de-correo-resend-mailtrap-smtp` · **Agente:** `spec-verifier`

Punto de partida: `git status --short` con los cambios de la spec sin commitear (11 archivos). Se detuvo el dev server de `:3000` para correr el build, se volvió a levantar para la matriz de desarrollo y se usó `next start -p 3002` para la de producción. Al cerrar: `.env` restaurado a `EMAIL_PROVIDER=resend`, 8 invitaciones de prueba borradas, servidor de `:3002` detenido y harness temporal eliminado.

### Comandos ejecutados

| Comando / consulta | Resultado |
| --- | --- |
| `npm run build` | ✅ exit 0 · 9/9 páginas · mismas 7 rutas (`/`, `/activar-cuenta`, `/familia`, `/login`, `/ninos`, `/ninos/[id]`, `/_not-found`) |
| `npx tsc --noEmit` | ✅ exit 0, sin salida |
| `npx eslint app` | ✅ exit 0, sin salida |
| Harness temporal de `config.ts` (17 casos dev/prod) | ✅ defaults, pares, puertos y guardas |
| E2E dev sin `EMAIL_PROVIDER` | ✅ `delivered@resend.dev` · `sent_at 06:06:54.659` · código `9NYHV` |
| E2E Mailtrap dev (`:3000`) | ✅ `spec13.mailtrap@example.com` · `sent_at 06:07:17.447` · código `25CMH` |
| E2E SMTP producción (`:3002`) | ✅ `spec13.smtp@example.com` · `sent_at 06:07:50.908` · código `2DHFG` |
| Guardas en `next start` | ✅ `mailtrap`, `resend` y ausente → alerta inline, log de configuración y `sent_at` nulo |
| Timeout `10.255.255.1:25` | ✅ 11,75 s en caliente (12,79 s en frío) · log `no response from smtp in 10000 ms` |
| Consola del navegador | ✅ 0 errores y 0 warnings en el modal |
| Bandeja de Mailtrap | ✅ el usuario confirmó los dos correos (dev y SMTP), con asunto y enlace |

### Criterios de aceptación (23/23 PASS)

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `build`, `tsc` y `eslint` sin errores | PASS | Los tres con exit 0; build 9/9 |
| 2 | `nodemailer` y `@types/nodemailer` en dev; `resend` presente | PASS | `^10.2.1`, `^8.0.2`, `resend ^6.34.1` |
| 3 | Estructura de `app/_lib/email/` y sin `resend.ts` | PASS | 6 archivos, `transports/` incluido |
| 4 | Solo los transports importan `resend` y `nodemailer` | PASS | `transports/resend.ts:3` y `transports/smtp.ts:3` |
| 5 | `invite-actions.ts` importa desde `@/app/_lib/email/invitation` | PASS | línea 6; sin referencias al módulo borrado |
| 6 | Cinco módulos con `server-only`; ningún cliente los importa | PASS | 5 coincidencias; 0 client components con `_lib/email` |
| 7 | Dev sin `EMAIL_PROVIDER` envía por Resend y escribe `sent_at` | PASS | `delivered@resend.dev`, `sent_at 06:06:54.659` |
| 8 | Mailtrap dev llega al sandbox y escribe `sent_at` | PASS | `sent_at 06:07:17.447`, código `25CMH`; inbox confirmado por el usuario |
| 9 | SMTP de producción envía bajo `npm start` | PASS | `sent_at 06:07:50.908`, código `2DHFG`; inbox confirmado por el usuario |
| 10 | `mailtrap` y `resend` rechazados en producción | PASS | Alerta inline, `sent_at` nulo, logs `not allowed in production` |
| 11 | Sin `EMAIL_PROVIDER` en producción falla sin conexión | PASS | Log `EMAIL_PROVIDER is required in production`; `sent_at` nulo |
| 12 | Mailtrap sin `MAILTRAP_PASSWORD` falla por configuración | PASS | Harness: `MAILTRAP_PASSWORD is missing`; sin dispatch |
| 13 | `EMAIL_FROM` obligatoria en mailtrap/smtp y default en resend | PASS | Harness: error en mailtrap/smtp, `onboarding@resend.dev` en resend |
| 14 | Par `SMTP_USER`/`SMTP_PASSWORD` obligatorio; vacíos = anónimo | PASS | Harness: error con usuario solo; `auth: false` con ambos vacíos |
| 15 | Timeout de 10–12 s, mensaje inline y `sent_at` nulo | PASS | 11,75 s en caliente; log `10000 ms`; alerta visible |
| 16 | Proveedor desconocido falla en dev y en prod | PASS | Harness: `unknown EMAIL_PROVIDER "foo"` en ambos |
| 17 | 465 TLS directo y 2525 STARTTLS | PASS | Harness `secure: true` en 465 y `false` en 2525; envío real por 2525 |
| 18 | `.env.template` con 11 variables, sin valores reales ni `NEXT_PUBLIC_` | PASS | 11 variables; 0 `NEXT_PUBLIC_EMAIL` |
| 19 | README con encabezado, matriz, sandbox y regla de producción | PASS | `README.md:8` y sección de la línea 99 |
| 20 | `RESEND_FROM_EMAIL` sin declarar y sin lectura funcional | PASS | 0 en `.env.template`; solo el warning de `send-email.ts:34,39` |
| 21 | Log con proveedor y motivo, sin credenciales ni HTML | PASS | `{ provider, reason, detail }` en las cuatro fallas |
| 22 | Sin rutas, `"use client"` ni copy nuevos; SPEC 11 14–21 intacto | PASS | 7 rutas, 14 `"use client"` sin cambios; panel, alerta y badges PENDIENTE iguales |
| 23 | Turbopack resuelve `nodemailer` sin `serverExternalPackages` | PASS | Build 9/9 con `next.config.ts` sin cambios (0 coincidencias) |

### Correcciones aplicadas en esta corrida

Ninguna. El código de la spec ya pasaba los 23 criterios; no se tocó `app/`.

### Contraste con la documentación de Next.js

- **Variables de entorno server-only.** `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:156`: *"Non-`NEXT_PUBLIC_` environment variables are only available in the Node.js environment"*. Y `:158`: solo las `NEXT_PUBLIC_` se inlinean en build. `EMAIL_PROVIDER`, `MAILTRAP_*` y `SMTP_*` no llevan prefijo y se leen dentro de `sendEmail()`, así que se resuelven en runtime. Correcto.
- **`serverExternalPackages`.** `01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md:8`: se usa solo si el paquete necesita `require` nativo de Node. `nodemailer` **no** figura en la lista auto-externalizada (líneas 21-99) y el build de Turbopack lo resolvió sin la opción, por lo que no se agregó configuración. Correcto.
- **Sin configuraciones de segmento.** No hay `dynamic`, `revalidate`, `fetchCache` ni `runtime`; el build marca las páginas como ◐ PPR. Correcto.

### Pendientes y riesgos

- El timeout se midió en 11,75 s en caliente y 12,79 s en el primer intento frío. El temporizador interno es de 10 s exactos (`detail: no response from smtp in 10000 ms`); la diferencia es el viaje de la Server Action. Si se quiere un margen estable, conviene ampliar el rango del criterio a 10–13 s.
- El criterio 7 se verificó con `delivered@resend.dev`, la dirección de prueba documentada por Resend. Una entrega a una bandeja real depende de un remitente verificado, que queda fuera de esta spec.
- `nodemailer` no está en la lista de paquetes auto-externalizados de Next.js. Hoy funciona con Turbopack; si una versión futura cambia el bundling, la mitigación ya está prevista en el criterio 23.
- `.env` está en `.gitignore`: las credenciales de Mailtrap y SMTP no se commitean.
