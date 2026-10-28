# OpenDayCare

Aplicación de gestión para guarderías: autenticación, feed de publicaciones, mantenimiento de niños y salas, e invitaciones para padres.

- **Framework:** Next.js 16 (App Router, PPR con `cacheComponents`)
- **UI:** React 19 + Tailwind CSS 4
- **Backend:** Supabase (Auth + Postgres con RLS)
- **Emails:** Resend o Mailtrap Sandbox en desarrollo, SMTP propio en producción (solo invitaciones)

---

## Requisitos

| Herramienta | Versión / nota |
| --- | --- |
| Node.js | `>= 20.9` (requisito de Next.js 16) |
| npm | Incluido con Node |
| Acceso al proyecto de Supabase | Pedir invitación a la organización del proyecto |
| Supabase CLI | Opcional, para `login`, tipos y gestión de cuenta |
| OpenCode | Opcional, para el flujo con los MCP de Supabase y Playwright |

Para solamente correr la app alcanza con Node, npm y las variables de entorno.

---

## Levantar el proyecto

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el archivo de entorno

El repo trae `.env.template`. Copialo a `.env.local`:

```powershell
# Windows (PowerShell)
Copy-Item .env.template .env.local
```

```bash
# macOS / Linux
cp .env.template .env.local
```

Completá los valores:

| Variable | Obligatoria | Dónde se obtiene |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Supabase Dashboard → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Supabase Dashboard → Project Settings → API Keys → publishable key (`sb_publishable_...`) |
| `NEXT_PUBLIC_APP_URL` | Recomendada | `http://localhost:3000` en desarrollo; se usa para el enlace de activación |
| `EMAIL_PROVIDER` | No | `resend` (default), `mailtrap` o `smtp`. En producción solo se acepta `smtp`. Ver [Correo](#correo-resend-mailtrap-y-smtp) |
| `EMAIL_FROM` | Según proveedor | Remitente visible. Obligatorio con `mailtrap` y `smtp`; con `resend` cae a `onboarding@resend.dev` |
| `RESEND_API_KEY` | No | [Resend](https://resend.com/api-keys). Sin ella la app levanta, pero no envía invitaciones por Resend |
| `SUPABASE_DB_PASSWORD` | No | Solo para comandos de CLI que se conectan a la base. La app no la lee |

Notas:

- `.env*` está en `.gitignore`: nunca commitees `.env.local` ni claves reales.
- La publishable key es pública por diseño; la `service_role` **no** se usa en la app y no debe aparecer en el frontend.
- Para que el registro de padres devuelva sesión, "Confirm email" debe estar desactivado en Supabase (Authentication → Sign In / Providers → Email). Ver `supabase/README.md`.

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Sin sesión, el proxy redirige a `/login`.

**Usuario demo** (creado por migración, rol `admin`):

```text
Email:    kevin07cv2008@gmail.com
Password: opendaycare2026
```

**Usuario demo de familia** (rol `parent`, madre de Mateo y Sofía en Soles):

```text
Email:    lucia.fernandez@opendaycare.com
Password: opendaycare2026
```

Son credenciales de demostración: cambialas antes de usar el proyecto fuera de desarrollo. El seed de la familia se aplica con `seed_family_demo` y se omite al promover.

Para probar el build de producción:

```bash
npm run build
npm start
```

---

## Correo: Resend, Mailtrap y SMTP

El proveedor se elige con `EMAIL_PROVIDER` y se resuelve en cada envío, nunca al importar el módulo. Todas las variables son server-only: ninguna lleva prefijo `NEXT_PUBLIC_`.

| Entorno | `EMAIL_PROVIDER` | Credenciales que se usan |
| --- | --- | --- |
| Desarrollo | `resend` (default si falta) | `RESEND_API_KEY` |
| Desarrollo | `mailtrap` | `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER`, `MAILTRAP_PASSWORD` |
| Desarrollo | `smtp` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |
| Producción | `smtp` (obligatorio) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` |

- En producción se rechazan `resend` y `mailtrap`: el envío falla con un error de configuración en el log y el usuario ve el mensaje genérico del modal. Un `mailtrap` olvidado en un deploy capturaría los correos en vez de entregarlos.
- `EMAIL_FROM` es obligatorio con `mailtrap` y `smtp`. Con `resend` se usa `OpenDayCare <onboarding@resend.dev>` cuando falta.
- `secure` no se configura: el puerto 465 usa TLS directo y el resto STARTTLS.
- En `smtp`, `SMTP_USER` y `SMTP_PASSWORD` son opcionales, pero siempre en par. Ambos vacíos habilitan la conexión anónima a un Postfix local en `127.0.0.1:25`.
- `RESEND_FROM_EMAIL` ya no se usa: si sigue en `.env.local` y falta `EMAIL_FROM`, la app avisa en el log y lo ignora. Renombrala a `EMAIL_FROM`.

### Mailtrap Sandbox en desarrollo

1. Entrá al inbox de pruebas en [Mailtrap](https://mailtrap.io) y abrí **Settings → SMTP Settings**.
2. Copiá host, puerto, usuario y contraseña a `MAILTRAP_HOST`, `MAILTRAP_PORT`, `MAILTRAP_USER` y `MAILTRAP_PASSWORD`.
3. Poné `EMAIL_PROVIDER=mailtrap` y un `EMAIL_FROM` cualquiera (el sandbox no valida el dominio).
4. Enviá una invitación desde `/ninos`: el correo aparece en el inbox de Mailtrap, no en una bandeja real.

### SMTP propio en producción

1. Configurá `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT` y `EMAIL_FROM` con un remitente del dominio.
2. Si el servidor exige autenticación, completá `SMTP_USER` y `SMTP_PASSWORD`.
3. El servidor SMTP necesita SPF, DKIM y PTR correctos para no caer en spam; eso se configura fuera de la app.
4. El envío tiene un timeout de 10 segundos y no reintenta solo. Si falla, el modal muestra el error y se puede reintentar con el mismo código.

---

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con Turbopack en `localhost:3000` |
| `npm run build` | Build de producción (valida TypeScript, no ESLint) |
| `npm start` | Sirve el build de producción |
| `npx tsc --noEmit` | Typecheck sin emitir archivos |
| `npx eslint app` | Lint acotado a la app (pasa limpio) |
| `npm run lint` | Lint de todo el repo. **Falla de base** por 2 errores en `references/pantallas/support.js`; no es una regresión tuya |

`references/` son maquetas HTML de diseño de solo lectura. No se importan en la app y no deben modificarse para "arreglar" el lint global.

---

## Estructura

```text
app/
  (app)/            Rutas protegidas: feed, niños, detalle de niño
  (auth)/           Login y activación de cuenta
  _components/      Componentes de UI
  _lib/             Queries, auth, email y utilidades
utils/supabase/     Factories de Supabase (server, client, middleware)
supabase/
  migrations/       Esquema aplicado, en SQL versionado
  README.md         Reglas del esquema, RLS, grants y seeds
specs/              Especificaciones (database/ para todo lo de Supabase)
proxy.ts            Refresco de sesión y protección de rutas (Middleware de Next 16)
```

La app habla con Supabase únicamente a través de `@supabase/supabase-js` + `@supabase/ssr`, usando las tres factories de `utils/supabase/`. No agregues otro cliente de Postgres ni llamadas HTTP a mano.

---

## Supabase: esquema y migraciones

La fuente de verdad del esquema es `supabase/migrations/<version>_<slug>.sql`. Los cambios se aplican **por el MCP de Supabase** (`apply_migration`) y después se commitea el archivo con la misma versión. No se usa `supabase db push`, Docker local ni `config.toml`.

Antes de tocar la base:

1. Leé `supabase/README.md`.
2. Creá o actualizá el spec en `specs/database/NN-slug.md`.
3. Aplicá el DDL con `apply_migration` y verificá con `list_migrations` + `list_tables`.

`public` está cerrado por defecto: RLS habilitado y sin grants para `anon`/`authenticated` hasta que una policy lo justifique. Un `permission denied` es el comportamiento esperado mientras no exista esa policy.

---

## Autenticación del MCP de Supabase

El MCP remoto de Supabase se autentica **por OAuth con tu propia cuenta**. Cada integrante usa su usuario; no se comparten tokens.

### 1. Tener acceso al proyecto

El dueño del proyecto debe invitar a cada integrante a la organización desde Supabase Dashboard → Organization Settings → Team. Sin ese acceso, el MCP no puede operar sobre el proyecto.

### 2. Configurar el servidor MCP

Agregá el servidor en tu configuración de OpenCode (global en `~/.config/opencode/opencode.json` o local en `opencode.json` del repo):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "supabase": {
        "type": "remote",
        "url": "https://mcp.supabase.com/mcp?project_ref=iquauyptfzwilctcoqgb&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching"
      }
    }
  }
}
```

El `project_ref` limita el MCP a este proyecto. No hace falta poner tokens en el archivo.

### 3. Iniciar sesión

```bash
opencode mcp auth supabase
```

Se abre el navegador: iniciá sesión en Supabase con tu cuenta y autorizá el acceso. OpenCode guarda las credenciales y las reutiliza; no hay que repetirlo en cada sesión.

Verificá el estado:

```bash
opencode mcp list
```

`supabase` debe aparecer como conectado. Podés probarlo pidiéndole al agente que liste las tablas de `public`.

Para cerrar sesión o cambiar de cuenta:

```bash
opencode mcp logout supabase
```

### Alternativa: token personal (CI o entornos sin navegador)

Creá un token en [Supabase → Account → Access Tokens](https://supabase.com/dashboard/account/tokens), asignale el proyecto y los permisos mínimos. Después reemplazá el bloque `supabase` dentro de `mcp.servers` por este, que desactiva el OAuth automático:

```json
{
  "supabase": {
    "type": "remote",
    "url": "https://mcp.supabase.com/mcp?project_ref=iquauyptfzwilctcoqgb",
    "oauth": false,
    "headers": {
      "Authorization": "Bearer {env:SUPABASE_ACCESS_TOKEN}"
    }
  }
}
```

Después exportá `SUPABASE_ACCESS_TOKEN` en la shell donde corrés OpenCode (no en `.env.local`, porque ese archivo lo lee Next.js, no OpenCode). El token **nunca** va commiteado en `opencode.json`, `.env.local` ni en el repo.

---

## Supabase CLI: login y acceso del equipo

La CLI sirve para autenticarte, listar proyectos, generar tipos y administrar la cuenta. **No reemplaza el flujo de migraciones por MCP** de este repo.

La CLI y el MCP son sesiones distintas: `supabase login` autentica la CLI y `opencode mcp auth supabase` autentica el MCP. Ambas usan tu misma cuenta de Supabase.

### Instalar

```powershell
# Windows: npm global
npm install -g supabase
supabase --version
```

Alternativas: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git` + `scoop install supabase`, o `npx supabase` sin instalación global.

### Iniciar sesión

```bash
supabase login
```

Abre el navegador y guarda el token en el almacén de credenciales del sistema (o en `~/.supabase/access-token` si no está disponible). Es el flujo recomendado para el equipo.

Para CI o terminales sin navegador:

```bash
supabase login --token sbp_tu_token
```

También podés evitar el login persistente definiendo `SUPABASE_ACCESS_TOKEN`; tiene prioridad sobre el token guardado.

### Verificar el acceso

```bash
supabase projects list
```

Si aparece el proyecto con ref `iquauyptfzwilctcoqgb`, tu cuenta ya está autenticada y tiene acceso. Si no aparece, pedí que te inviten a la organización.

### Reglas para el equipo

- Cada persona inicia sesión con **su propia cuenta** y su propio token.
- No se comparten tokens ni se commitea `sbp_...`.
- Los tokens se revocan desde [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) si se filtran.
- Hoy no se corre `supabase link` ni `supabase db push`: el proyecto no tiene `config.toml` y las migraciones se aplican por el MCP.

### Generar tipos (opcional)

Con sesión iniciada, sin necesidad de linkear el proyecto:

```bash
npx supabase gen types typescript --project-id iquauyptfzwilctcoqgb > utils/supabase/database.types.ts
```

En Windows PowerShell 5.1, redirigí con `| Out-File -Encoding utf8 utils/supabase/database.types.ts` para no guardar el archivo en UTF-16. El archivo generado se revisa y se commitea; no se edita a mano.

---

## Problemas comunes

| Síntoma | Causa / solución |
| --- | --- |
| La app falla al arrancar por `supabaseUrl is required` | Faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local` |
| Todo redirige a `/login` | No hay sesión. Verificá las credenciales demo o la cookie `sb-*-auth-token` |
| `Tu cuenta no está habilitada` | La sesión existe pero falta la fila en `public.users` o está inactiva |
| `permission denied for table ...` | RLS/grants cerrados por diseño; hace falta una policy en un spec |
| `opencode mcp auth` no conecta | Verificá el `project_ref`, tu acceso a la organización y volvé a correr `opencode mcp logout supabase` + `opencode mcp auth supabase` |
| `supabase: command not found` | Instalala de nuevo y asegurate de que el binario esté en el `PATH` |
| Resend devuelve 403 | El remitente no está verificado o `onboarding@resend.dev` intenta enviar a un email ajeno a la cuenta |
| `npm run lint` falla | Es el lint global sobre `references/`; usá `npx eslint app` |

---

## Documentación del proyecto

- `AGENTS.md`: convenciones de Next.js 16, Supabase y MCPs.
- `supabase/README.md`: reglas de esquema, RLS, grants, enums, auth e invitaciones.
- `specs/`: especificaciones funcionales y de base de datos.
- `references/pantallas/index.dc.html`: maquetas de las pantallas.
