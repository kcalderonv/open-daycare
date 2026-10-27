# SPEC 09 — Autenticación con email y contraseña y protección de rutas

> **Status:** Aprovado
> **Depends on:** SPEC 03, SPEC 07, SPEC 08
> **Date:** 2026-10-26
> **Objective:** Implementar login y logout reales contra Supabase Auth con email y contraseña, proteger todo el grupo `(app)` y mostrar el usuario autenticado en la sidebar.

## Por qué existe esta spec

- SPEC 03 dejó fuera "autenticación real, sesión, cookies, middleware de protección o guardas de ruta".
- SPEC 08 dejó `public.users` sin FK a `auth.users`, sin policies y sin grants, y delegó explícitamente esa deuda a la spec de autenticación.
- El diccionario `07-DB-Schema` define que las credenciales viven en `auth.users` y que `public.users` es el perfil de dominio: esta spec materializa ese vínculo.
- El proyecto ya tiene las tres fábricas de `@supabase/ssr` y el refresh de sesión en `proxy.ts`; falta usarlas para decidir quién entra.

## Scope

**In:**

- `supabase/migrations/<version>_seed_auth_demo_user.sql`: usuario `caro@opendaycare.com` en `auth.users` + `auth.identities` con el UUID fijo `d3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d` que ya usa `public.users`, email confirmado y contraseña `opendaycare2026` hasheada con `extensions.crypt`.
- `supabase/migrations/<version>_link_users_auth.sql`: FK `users_auth_fkey` de `public.users(id)` a `auth.users(id)` con `on delete cascade`.
- `supabase/migrations/<version>_open_users_self_read.sql`: policy `users_select_own`, `grant select` de `public.users` a `authenticated` y `USAGE` de `user_role`/`user_status` a `authenticated`.
- Aplicar las tres migraciones con el MCP `apply_migration` y versionarlas en `supabase/migrations/`.
- `utils/supabase/database.types.ts`: tipos generados con el MCP `generate_typescript_types` y pasados como genérico en `server.ts`, `client.ts` y `middleware.ts`.
- `utils/supabase/middleware.ts`: `updateSession` devuelve `{ response, claims }` además de refrescar la sesión.
- `app/_lib/next-path.ts`: `resolveNextPath`, único sanitizador del parámetro `next`.
- `app/_lib/auth.ts`: DAL con `getCurrentUser()` y el tipo `CurrentUser`.
- `app/(auth)/login/actions.ts`: Server Action `login` con `signInWithPassword`, validación, error genérico, verificación de perfil y `redirect`.
- `app/_components/auth/login-form.tsx`: client component con `useActionState`, campos, alerta de error y estado `Ingresando…`.
- `app/_components/auth/auth-submit.tsx`: suma `AuthSubmitButton` y extrae `AUTH_SUBMIT_CLASSES`; `AuthSubmit` (Link) se mantiene para `/activar-cuenta`.
- `app/(auth)/login/page.tsx`: lee `searchParams` dentro de un `<Suspense>` y renderiza `LoginForm`; el campo EMAIL deja de venir precargado.
- `proxy.ts`: redirect a `/login?next=…` sin sesión, redirect a `/` (o al `next`) con sesión en `/login`, conservando el 404 de `/ninos/[id]` y las cookies refrescadas.
- `app/(app)/layout.tsx`: gate con `getCurrentUser()` dentro de `<Suspense>` con `AppShellSkeleton` como fallback.
- `app/_components/app-shell.tsx`: recibe `user` y se lo pasa a la sidebar.
- `app/_components/app-sidebar.tsx`: nombre, inicial y rol reales; "Cerrar sesión" pasa de `Link` a `<form action={signOut}>`.
- `app/(app)/actions.ts`: Server Action `signOut`.
- `app/_components/app-shell-skeleton.tsx`: shell mínimo sin usuario para el fallback.
- `supabase/README.md`: sección **Auth** con el seed, la FK, la policy y los grants.

**Out of scope (para specs futuras):**

- `/activar-cuenta` real: `signUp`, `invitations`, `inviteUserByEmail` o cualquier alta de usuario.
- Recuperar contraseña, plantillas de email y confirmación de correo para usuarios nuevos.
- OAuth, magic link, MFA, "recordarme" y cambio de contraseña.
- Trigger `AFTER INSERT` en `auth.users` para crear el perfil: no hay flujo de alta todavía.
- Autorización por rol o por daycare, policies de `daycares`, edición de perfil.
- Salir desde el header móvil (hoy no existe botón de salir fuera de la sidebar).
- Que el feed use datos reales: `currentUser` y `currentRoom` siguen mock salvo en la sidebar.
- Tests automatizados, modo oscuro e i18n.

## Data model

### Estado remoto de partida (verificado el 2026-10-26)

- `auth.users`: 0 filas. `auth.identities`: 0 filas. No hay triggers en `auth.users`.
- `public.users`: 1 fila, `id = d3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d`, `full_name = 'Caro Rojas'`, `role = 'admin'`, `status = 'active'`, daycare `sala-soles`.
- `pgcrypto` instalado en `extensions`.
- `auth.identities.id` tiene default `gen_random_uuid()`; `auth.identities.email` es columna generada (`lower(identity_data->>'email')`) y no se inserta.
- `auth.users.confirmed_at` es columna generada (`LEAST(email_confirmed_at, phone_confirmed_at)`) y no se inserta.

### Migración 1 — usuario demo de Auth

```sql
-- supabase/migrations/<version>_seed_auth_demo_user.sql
do $$
declare
  demo_id    constant uuid := 'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d';
  demo_email constant text := 'caro@opendaycare.com';
begin
  if exists (
    select 1 from auth.users
    where id = demo_id or email = demo_email
  ) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_confirm_status, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    demo_id,
    'authenticated',
    'authenticated',
    demo_email,
    extensions.crypt('opendaycare2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Caro Rojas'),
    '', '', '', '',
    0, false, false
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    demo_id::text,
    demo_id,
    jsonb_build_object(
      'sub', demo_id::text,
      'email', demo_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  )
  on conflict (provider_id, provider) do nothing;
end
$$;
```

Convenciones:

- El UUID es el mismo de SPEC 08; sin eso la FK del paso siguiente falla y la sidebar queda sin perfil.
- `instance_id` es el UUID cero, el valor que usa GoTrue en proyectos hosted.
- `confirmation_token`, `recovery_token`, `email_change` y `email_change_token_new` van en `''`, no en `NULL`: así GoTrue no interpreta tokens pendientes y los índices únicos parciales los ignoran.
- `email_confirmed_at` va seteado para que el login no dependa de la configuración de "Confirm email" del proyecto.
- La contraseña es de demo y queda documentada; no se reutiliza en producción.

### Migración 2 — vínculo con Auth

```sql
-- supabase/migrations/<version>_link_users_auth.sql
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_auth_fkey'
  ) then
    alter table public.users
      add constraint users_auth_fkey foreign key (id)
      references auth.users (id) on delete cascade;
  end if;
end
$$;
```

Convenciones:

- `on delete cascade`: borrar el usuario de Auth borra el perfil; no queda huérfano.
- Se aplica después del seed: con la tabla en 1 fila y sin usuario de Auth, la FK fallaría.
- No se agrega trigger de alta: primero tienen que existir el flujo de invitación y las policies que lo justifiquen.

### Migración 3 — lectura del perfil propio

```sql
-- supabase/migrations/<version>_open_users_self_read.sql
drop policy if exists users_select_own on public.users;

create policy users_select_own
on public.users
for select
to authenticated
using (id = (select auth.uid()));

grant select on table public.users to authenticated;
grant usage on type public.user_role, public.user_status to authenticated;
```

Convenciones:

- Solo `select` y solo la fila propia: no hay UI de edición de perfil ni lectura por daycare.
- `anon` sigue sin grants ni policies sobre `users`.
- `service_role` conserva su acceso completo desde SPEC 08.
- Se conceden los dos enums porque PostgREST necesita `USAGE` para serializar `role` y `status`; SPEC 08 los había cerrado a propósito.

### Tipos TypeScript

```ts
// app/_lib/auth.ts
export type UserRole = "admin" | "staff" | "parent";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: UserRole;
};

export function getCurrentUser(): Promise<CurrentUser>;
```

```ts
// app/(auth)/login/actions.ts
export type LoginState = {
  error: string | null;
};

export function login(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState>;
```

```ts
// app/_components/auth/login-form.tsx
type LoginFormProps = {
  nextPath: string;
  accountError: boolean;
};
```

```ts
// app/_lib/next-path.ts
export function resolveNextPath(value: string | null | undefined): string;
```

Contrato de `resolveNextPath`:

| Entrada | Salida |
| --- | --- |
| `null`, `""` o `undefined` | `/` |
| `"/ninos"` | `/ninos` |
| `"/ninos?filtro=sole"` | `/ninos?filtro=sole` |
| `"//evil.com"` | `/` |
| `"https://evil.com"` | `/` |

### Copy y estados del login

- Campos vacíos o sin email: `Ingresá tu email y tu contraseña.`
- Credenciales inválidas, email no confirmado o usuario inexistente: `Email o contraseña incorrectos.`
- Rate limit (`status === 429`): `Demasiados intentos. Esperá unos minutos y volvé a probar.`
- Perfil ausente, inactivo o ilegible después del login: `Tu cuenta no está habilitada. Contactá a la guardería.`
- Banner de `/login?error=no-account`: `Tu cuenta no está habilitada. Ingresá con otra cuenta o contactá a la guardería.`
- Botón pendiente: `Ingresando…`.
- Roles en la sidebar: `admin → Administración`, `staff → Maestro/a`, `parent → Familia`.

## Convenciones de código

Se mantienen las de SPEC 01 a 08: identificadores en inglés, copy en español, named exports, sin `any`, sin `style={{}}`, sin hex en el JSX y sin configs de ruta (`dynamic`, `revalidate`, `fetchCache`, `runtime`).

Específicas de esta spec:

- **Server Actions en `actions.ts`**: `app/(auth)/login/actions.ts` y `app/(app)/actions.ts`. Las páginas y componentes siguen siendo server components salvo `login-form.tsx`.
- **`cookies()` en server action**: `createClient(await cookies())`; `utils/supabase/server.ts` no es async.
- **`redirect` fuera del `try/catch`**: `NEXT_REDIRECT` no se captura.
- **`revalidatePath("/", "layout")`** después de login y logout, antes del `redirect`.
- **Un solo sanitizador de `next`**: `resolveNextPath` lo usan proxy y action; no se duplica la regla.
- **Redirects del proxy conservan cookies**: toda respuesta 307 copia `response.cookies` de `updateSession`, igual que el 404 existente.
- **`getClaims()` en el proxy, `getClaims()` + consulta de perfil en la DAL**: no se usa `getUser()` en el proxy ni se consulta la DB ahí.
- **Lectura de sesión dentro de `<Suspense>`**: obligatorio con `cacheComponents`; también `searchParams` en `/login`.
- **React `cache()`** para deduplicar `getCurrentUser` en el mismo render; no se usa `use cache: private`.
- **Sin `server-only`**: el paquete no está instalado y no se agregan dependencias.
- **El email no se precarga**: `caro@opendaycare.com` deja de ser `defaultValue`.
- **`noValidate` en el `<form>`** y validación en la action, para controlar los mensajes.
- **Un error genérico** para cualquier fallo de credenciales: no se revela si el email existe.

## Implementation plan

1. **Seed de Auth.** Aplicar `seed_auth_demo_user` con `apply_migration`, anotar el `version` y crear el archivo. Test: `execute_sql` devuelve 1 fila en `auth.users` y 1 en `auth.identities` con el UUID demo.
2. **FK.** Aplicar `link_users_auth`, crear el archivo. Test: `pg_constraint` muestra `users_auth_fkey` con `ON DELETE CASCADE`; `public.users` sigue con 1 fila.
3. **Policy y grants.** Aplicar `open_users_self_read`, crear el archivo. Test: `pg_policies` y `has_table_privilege`/`has_type_privilege` en verde.
4. **Tipos generados.** Correr `generate_typescript_types`, crear `utils/supabase/database.types.ts` y pasar `Database` como genérico en las tres fábricas. Test: `npx tsc --noEmit` limpio.
5. **Claims en el refresh.** Cambiar `updateSession` a `{ response, claims }` y adaptar `proxy.ts` sin cambiar todavía su lógica. Test: `npm run build` verde y `/ninos/no-existe` sigue en 404.
6. **Sanitizador y DAL.** Crear `app/_lib/next-path.ts` y `app/_lib/auth.ts`. Test: `npx tsc --noEmit` limpio.
7. **Login real.** Crear `login-form.tsx`, la action `login`, `AuthSubmitButton` y reescribir `app/(auth)/login/page.tsx`. Test: con `npm run dev`, `caro@opendaycare.com` / `opendaycare2026` crea la cookie `sb-*-auth-token` y navega a `/`; una contraseña incorrecta deja el error inline.
8. **Protección en el proxy.** Agregar los dos redirects y el `next`. Test: sin cookies, `/` responde 307 a `/login?next=%2F`; `/login` y `/activar-cuenta` responden 200; con sesión, `/login` va a `/`.
9. **Gate y sidebar.** Suspense + `getCurrentUser()` en `(app)/layout.tsx`, `AppShellSkeleton`, `user` en `AppShell`/`AppSidebar` y `signOut`. Test: la sidebar muestra "Caro Rojas", inicial "C" y "Administración"; "Cerrar sesión" vuelve a `/login` y borra la cookie.
10. **Documentación.** Agregar la sección **Auth** a `supabase/README.md` y regenerar tipos si cambió el esquema.
11. **Cierre.** `npm run build`, `npx tsc --noEmit` y `npx eslint app`; `git diff --name-only` sin cambios en `package.json` ni en `references/`.

## Acceptance criteria

- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` termina sin errores.
- [x] `npx eslint app` termina sin errores.
- [x] Los tres `supabase/migrations/<version>_*.sql` existen y sus `<version>` coinciden con `list_migrations`.
- [x] `auth.users` tiene exactamente 1 fila: `id = 'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d'`, `email = 'caro@opendaycare.com'`, `email_confirmed_at` no nulo y `encrypted_password` con prefijo `$2`.
- [x] `auth.identities` tiene 1 fila con `provider = 'email'`, `user_id` igual al UUID demo y `identity_data->>'email' = 'caro@opendaycare.com'`.
- [x] Existe la constraint `users_auth_fkey` de `public.users(id)` a `auth.users(id)` con `on delete cascade`.
- [x] Existe la policy `users_select_own` para `authenticated` con `using (id = auth.uid())`.
- [x] `has_table_privilege('authenticated', 'public.users', 'select')` es `true`; para `anon` es `false`.
- [x] `has_type_privilege('authenticated', 'public.user_role', 'usage')` y lo mismo con `user_status` son `true`; para `anon` son `false`.
- [x] Sin cookies, `GET /` responde 307 hacia `/login?next=%2F`.
- [x] Sin cookies, `/ninos` y `/ninos/mateo-fernandez` responden 307 hacia `/login` con su `next` codificado.
- [x] Sin cookies, `/login` y `/activar-cuenta` responden 200.
- [x] Sin cookies, `/ninos/no-existe` sigue respondiendo 404 (el 404 corre antes que el redirect).
- [x] `/login` muestra los labels EMAIL y CONTRASEÑA, el email arranca vacío y el CTA es un `<button type="submit">`, no un `Link`.
- [x] Con contraseña incorrecta, `/login` muestra `Email o contraseña incorrectos.` en un elemento con `role="alert"` y no crea cookie de sesión.
- [x] Con los campos vacíos, `/login` muestra `Ingresá tu email y tu contraseña.`.
- [x] Con `caro@opendaycare.com` / `opendaycare2026`, la app navega a `/` y existe una cookie cuyo nombre empieza con `sb-` y contiene `auth-token`.
- [x] La sidebar muestra "Caro Rojas", la inicial "C", el rol "Administración" y el saludo del feed sigue siendo "Buenas, Caro".
- [x] Recargar `/` mantiene la sesión y la sidebar con los datos reales.
- [x] Con sesión activa, `/login` redirige a `/`.
- [x] Entrar a `/login?next=%2Fninos` y autenticarse aterriza en `/ninos`.
- [x] Entrar a `/login?next=//example.com` y autenticarse aterriza en `/`.
- [x] "Cerrar sesión" navega a `/login`, elimina la cookie de sesión y un `GET /` posterior vuelve a responder 307.
- [x] Un usuario de Auth sin fila en `public.users` (creado y borrado durante la verificación) recibe `Tu cuenta no está habilitada. Contactá a la guardería.` y no conserva cookie de sesión.
- [x] `GET /login?error=no-account` con una sesión sin perfil no entra en bucle: se queda en `/login` y muestra el banner.
- [x] `/activar-cuenta` sigue siendo pública y su CTA "Activar mi cuenta" apunta a `/`.
- [x] La consola no muestra errores ni warnings de React en `/login`, `/` y `/ninos`.
- [x] A 390px, `/login` y su estado de error se ven completos y `documentElement.scrollWidth` no supera `innerWidth`.
- [x] `app/` no agrega `dynamic`, `revalidate`, `fetchCache`, `runtime` ni `dynamicParams`.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`.
- [x] `package.json` y `package-lock.json` no cambian.

## Decisions

- **Sí:** solo email y contraseña. Es lo que pide el producto y no arrastra invitaciones, plantillas ni callback de email.
- **No:** signup/activación real en esta spec. `/activar-cuenta` necesita `invitations`, `children` y `parent_children`, que no existen; metido acá duplicaría el tamaño y el riesgo.
- **No:** recuperar contraseña. Requiere configurar Site URL, plantilla y una ruta de callback.
- **Sí:** Server Action con `signInWithPassword`. Es el patrón de la doc de Supabase para App Router y es el único lugar donde se pueden escribir las cookies de sesión.
- **Sí:** `<form>` + `useActionState`. Reemplaza la convención de SPEC 03 ("sin `<form>`"), que existía justamente porque no había auth.
- **Sí:** dos capas de protección. `proxy.ts` hace el chequeo optimista con `getClaims()` y la DAL vuelve a verificar el perfil. Es lo que pide la guía de autenticación de Next 16 y no confía solo en el Proxy.
- **No:** `getUser()` en el proxy. Hace una llamada al servidor de Auth en cada request y en cada prefetch; `getClaims()` valida el JWT localmente con JWKS.
- **No:** consultar la DB en el proxy. La guía de Next lo desaconseja explícitamente por rendimiento y por prefetch.
- **Sí:** todo el grupo `(app)` cerrado; `/login` y `/activar-cuenta` públicas. Es el mínimo coherente con una guardería.
- **Sí:** `next` sanitizado y compartido. Sin esto el redirect acepta `https://evil.com` o `//evil.com`.
- **Sí:** usuario demo sembrado por migración con UUID fijo. Es reproducible, no depende de la UI del Dashboard y conserva el ancla de SPEC 08.
- **No:** crear el usuario a mano en el Dashboard. Obligaría a cambiar el id de `public.users` y a rehacer el seed.
- **Sí:** `email_confirmed_at` seteado. Evita que el demo dependa de la configuración de confirmación del proyecto.
- **Sí:** FK con `on delete cascade`. Sin cascade quedarían perfiles huérfanos al borrar un usuario de Auth.
- **No:** trigger `AFTER INSERT` en `auth.users`. No hay flujo de alta; se agrega con la spec de activación.
- **Sí:** policy de solo lectura de la fila propia. Es lo único que la sidebar necesita; edición y lectura por daycare quedan fuera.
- **Sí:** regenerar tipos y tipar las fábricas con `Database`. Evita duplicar tipos de fila y da el union de `role`.
- **Sí:** cuenta sin perfil = sin acceso. El login cierra la sesión apenas detecta que falta la fila; la DAL repite el control como defensa.
- **Sí:** `error=no-account` como excepción en el proxy. Sin esa excepción, "autenticado en `/login` → `/`" y "sin perfil → `/login`" se redirigen mutuamente para siempre.
- **No:** `use cache: private` en `getCurrentUser`. Cachea al usuario hasta 5 minutos y complica la invalidación después de cambiar de cuenta; `cache()` de React alcanza para deduplicar el render.
- **Sí:** `await connection()` al inicio de `getCurrentUser`. Supabase resuelve la expiración del token con `Date.now()` y, con `cacheComponents`, esa lectura hacía fallar la validación de prerender con `blocking-prerender-current-time`; `connection()` la difiere al request, que es donde corresponde.
- **Sí:** `export const instant = false` en `app/(app)/layout.tsx`. El segmento bloquea en la sesión por diseño; el export no cambia el render, solo declara que la navegación hacia el grupo puede bloquear y lo saca de la validación de Instant Navigation de Next en desarrollo.
- **Sí:** email vacío. La precarga era fidelidad al mockup, no una decisión de producto, y ensucia cualquier prueba con otra cuenta.
- **No:** `server-only`. No está instalado; agregarlo sería una dependencia nueva sin beneficio para un solo módulo.
- **Sí:** error de credenciales genérico. No permite enumerar emails.
- **No:** logout en el header móvil. Hoy el mockup no lo tiene y el shell móvil queda igual.

## Risks

| Risk | Mitigation |
| --- | --- |
| Insertar en `auth.users` no es API pública de Supabase y puede romperse si GoTrue cambia el esquema | El criterio de login real lo detecta de inmediato. Si falla, el plan B es crear el usuario desde el Dashboard y ajustar el id de `public.users` en una migración. |
| `instance_id` distinto del que espera GoTrue | Se verifica que el login real funcione en el criterio correspondiente; si falla, se consulta el id con `select instance_id from auth.users` de un usuario creado desde el Dashboard. |
| La contraseña demo queda commiteada | Es un dato de demo y está documentada como tal; nunca se reutiliza en producción y el usuario se borra antes de promover. |
| El redirect del proxy pierde las cookies refrescadas y la sesión se cae al entrar a una ruta protegida | Todo redirect copia `response.cookies` de `updateSession`, igual que el 404 actual. |
| Bucle de redirect entre `/login` y `/` para una sesión sin perfil | El proxy excluye `/login` del redirect cuando hay `?error=` y la DAL usa `?error=no-account`. |
| `searchParams` en `/login` fuera de `<Suspense>` rompe el build con `cacheComponents` | La página resuelve `searchParams` dentro de un `<Suspense>` con `LoginForm` como fallback. |
| El gate del grupo `(app)` dentro de `<Suspense>` hace que la primera carga muestre el skeleton | El skeleton replica sidebar, header y fondo para no mover el layout; la navegación cliente reutiliza el boundary y no lo muestra. |
| La policy o los grants quedan mal y el perfil no se lee después del login | El login cierra la sesión y muestra un error; los criterios de `has_table_privilege`, `has_type_privilege` y login real lo detectan. |
| Un email ya existente en `auth.users` con otro id bloquea el seed y la FK | La migración no inserta si el email existe; la verificación de la fila demo con el UUID fijo lo detecta antes de aplicar la FK. |

## What is **not** in this spec

- Alta de usuarios, invitaciones y `/activar-cuenta` real.
- Recuperar contraseña, plantillas de email, confirmación de correo y callback de Auth.
- OAuth, magic link, MFA, cambio de contraseña y "recordarme".
- Trigger de creación de perfil y cualquier sincronización con `raw_user_meta_data`.
- Autorización por rol o por daycare, policies de `daycares` y edición de perfil.
- Datos reales en el feed y en el avatar del composer.
- Logout en el header móvil.
- Tests automatizados, modo oscuro e i18n.

Cada uno de esos, si llega, va en su propia spec.

## Verification report

- **Fecha:** 2026-10-27
- **Branch:** `spec-09-autenticacion-y-proteccion-de-rutas` (HEAD `d8fe313` "09-autenticacion-proteccion")
- **Entorno:** Next.js 16.4.3 (Turbopack), dev server propio en `localhost:3000` (el PID 29700 ya no escuchaba) y detenido al terminar, Supabase remoto vía MCP, Playwright MCP.
- **Resultado:** 32/32 criterios PASS. No se modificó código de producto: la implementación commiteada pasó tal cual.

### Comandos ejecutados

| Comando | Resultado | Evidencia |
| --- | --- | --- |
| `npm run build` | exit 0 | `✓ Compiled successfully in 2.6s`, `Finished TypeScript in 4.4s`, 16 páginas; rutas `/`, `/login`, `/ninos` como `◐` (PPR) y Proxy detectado. `.playwright-mcp/build-09.log` |
| `npx tsc --noEmit` | exit 0, sin diagnósticos | `.playwright-mcp/tsc-09.log` |
| `npx eslint app` | exit 0, sin diagnósticos | `.playwright-mcp/eslint-09.log` |
| `list_migrations` (MCP) | 3 migraciones presentes | `20261027045257 seed_auth_demo_user`, `20261027045305 link_users_auth`, `20261027045306 open_users_self_read` |
| `execute_sql` (MCP) | catálogo, grants, RLS y privs | ver tabla |
| `curl` sin cookies | 307/200/404 | ver tabla |
| Playwright MCP | login, logout, `next`, cookie, 390px, consola | ver tabla |

### Criterios

| # | Criterio (resumen) | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `npm run build` sin errores | PASS | exit 0; `✓ Compiled successfully in 2.6s` |
| 2 | `npx tsc --noEmit` sin errores | PASS | exit 0, sin salida de diagnósticos |
| 3 | `npx eslint app` sin errores | PASS | exit 0, sin salida de diagnósticos |
| 4 | Tres migraciones con versión coincidente | PASS | archivos `20261027045257_seed_auth_demo_user.sql`, `20261027045305_link_users_auth.sql`, `20261027045306_open_users_self_read.sql` = `list_migrations` |
| 5 | `auth.users` 1 fila demo correcta | PASS | `users_rows=1`, `demo_ok=1`, `email='caro@opendaycare.com'`, `email_confirmed_at` no nulo, `pw_prefix='$2a$'` |
| 6 | `auth.identities` 1 fila email | PASS | `identities_rows=1`, `identity_ok=1` (provider `email`, `user_id` demo, `identity_data->>'email'` correcto) |
| 7 | FK `users_auth_fkey` con cascade | PASS | `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`, `confdeltype='c'` |
| 8 | Policy `users_select_own` | PASS | `roles={authenticated}`, `cmd=SELECT`, `qual=(id = ( SELECT auth.uid() AS uid))`; 1 sola policy en `public.users` |
| 9 | Grants `select` de `users` | PASS | `authenticated=true`, `anon=false` |
| 10 | USAGE de `user_role`/`user_status` | PASS | `authenticated=true` en ambos; `anon=false` en ambos |
| 11 | Sin cookies `/` → 307 `/login?next=%2F` | PASS | `HTTP/1.1 307`, `location: /login?next=%2F` |
| 12 | Sin cookies `/ninos` y `/ninos/mateo-fernandez` | PASS | `/ninos` → `/login?next=%2Fninos`; `/ninos/mateo-fernandez` → `/login?next=%2Fninos%2Fmateo-fernandez` |
| 13 | Sin cookies `/login` y `/activar-cuenta` → 200 | PASS | ambos `HTTP/1.1 200 OK` sin `location` |
| 14 | `/ninos/no-existe` → 404 | PASS | `HTTP/1.1 404 Not Found` (el proxy corta antes del redirect) |
| 15 | Labels, email vacío y CTA botón | PASS | labels `EMAIL`/`CONTRASEÑA`; `<input name="email">` sin atributo `value` y `defaultValue=""` (SSR idéntico); CTA `BUTTON[type=submit]` "Iniciar sesión" |
| 16 | Contraseña incorrecta | PASS | `role="alert"` = `Email o contraseña incorrectos.`; `cookies=[]` |
| 17 | Campos vacíos | PASS | `role="alert"` = `Ingresá tu email y tu contraseña.` |
| 18 | Login demo navega a `/` y crea cookie | PASS | `url=/`, cookie `sb-iquauyptfzwilctcoqgb-auth-token` |
| 19 | Sidebar con datos reales | PASS | aside: inicial `C`, nombre `Caro Rojas`, rol `Administración`; `h1` = `Buenas, Caro` |
| 20 | Recarga mantiene sesión | PASS | tras `reload`: `url=/`, cookie presente, sidebar `Caro Rojas / Administración` |
| 21 | Con sesión, `/login` → `/` | PASS | `finalPath=/` (también en la variante `GET /login`) |
| 22 | `next=/ninos` aterriza en `/ninos` | PASS | `input[name=next]="/ninos"` → `url=/ninos` |
| 23 | `next=//example.com` aterriza en `/` | PASS | `input[name=next]="/"` → `url=/`, `origin=http://localhost:3000` |
| 24 | Cerrar sesión limpia todo | PASS | click → `url=/login`, `cookies=[]`; `curl /` → `307 location: /login?next=%2F` |
| 25 | Usuario de Auth sin perfil | PASS | usuario temporal sin fila → `role="alert"` = `Tu cuenta no está habilitada. Contactá a la guardería.`, `cookies=[]`; usuario borrado al terminar |
| 26 | `?error=no-account` sin bucle | PASS | con sesión sin perfil, `GET /` → `/login?error=no-account` estable 6 muestras consecutivas (1 s) y banner `Tu cuenta no está habilitada. Ingresá con otra cuenta o contactá a la guardería.`; visita directa al mismo URL también se queda |
| 27 | `/activar-cuenta` pública y CTA | PASS | 200 sin cookies y con sesión; `link "Activar mi cuenta"` → `href="/"` |
| 28 | Consola sin errores ni warnings | PASS | 102 entradas en `.playwright-mcp/console-2026-10-27T05-23-00-517Z.log`, 0 `[ERROR]`/`[WARNING]` en `/login`, `/`, `/ninos`; `browser_console_messages` = `Errors: 0, Warnings: 0` |
| 29 | 390px sin scroll horizontal | PASS | `/login`: `scrollWidth=390`, `innerWidth=390`; estado de error: `scrollWidth=390`, alerta 342×43 y CTA 342×52 visibles |
| 30 | Sin `dynamic`/`revalidate`/`fetchCache`/`runtime`/`dynamicParams` | PASS | grep de `export const <config>` en `app/`: 0 coincidencias (no se cuentan `await connection()` ni `instant = false`, ambos aprobados en Decisions) |
| 31 | Sin `any`, `@ts-ignore`, `style={{}}` ni hex | PASS | grep en `app/`: 0 coincidencias de `\bany\b`, `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`, `style={{`, `#hex` en `.tsx`/`.ts` |
| 32 | `package.json` y `package-lock.json` sin cambios | PASS | `git diff --stat a9fa2c7..HEAD -- package.json package-lock.json` vacío; working tree sin cambios en esos archivos |

### Documentación contrastada

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md:1024-1033`: el Proxy es para chequeos optimistas y **no** debe consultar la DB. `proxy.ts` solo usa `getClaims()`; la consulta de perfil vive en la DAL (`app/_lib/auth.ts`).
- `node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md:45` y `03-api-reference/03-file-conventions/02-route-segment-config/instant.md:120`: `instant = false` es el opt-out oficial de la validación de Instant Navigation; no cambia el modelo de render.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.mdx`: `connection()` difiere al request-time; coincide con el uso en `getCurrentUser`.
- Context7 (`/vercel/next.js/v16.2.9`): mismas dos conclusiones (optimistic checks + `connection()` con `<Suspense>`).

### Capturas (`.playwright-mcp/`)

- `verify-09-feed-1440.png` — `/` con sesión real (sidebar "Caro Rojas / Administración").
- `verify-09-ninos-1440.png` — `/ninos` con sesión.
- `verify-09-login-390.png` — `/login` a 390px.
- `verify-09-login-error-390.png` — estado de error a 390px.
- `verify-09-no-profile-error.png` — error de cuenta sin perfil en el formulario.
- `verify-09-no-account-banner.png` — banner `?error=no-account` con sesión sin perfil.

No hay captura de referencia de `/login` en `references/screenshots/`, así que no se declara paridad visual: solo se verificó contenido, estado y medidas del criterio 29.

### Archivos modificados

- `specs/database/09-autenticacion-y-proteccion-de-rutas.md` (checkboxes y este reporte).
- Ningún archivo de `app/`, `utils/`, `proxy.ts`, `supabase/` ni `package*.json`.
- Artefactos de verificación: `build-09.log`, `tsc-09.log`, `eslint-09.log`, `console-2026-10-27T05-23-00-517Z.log` y las capturas `verify-09-*.png` (todo en `.playwright-mcp/`, gitignored).

### Datos temporales de verificación

- Se creó `verify09-temp@opendaycare.com` en `auth.users`/`auth.identities` y, para poder obtener una sesión real, un perfil temporal en `public.users` que se borró antes de probar el bucle.
- Estado final verificado: `auth.users = 1`, `auth.identities = 1`, `public.users = 1`.
- Sesiones/identidades del usuario demo: sin cambios.

### Observaciones y riesgos

- El campo EMAIL arranca vacío en el HTML (`value` ausente, `defaultValue=""`), pero el perfil persistente de Playwright autocompleta credenciales del demo y el value aparece relleno en las capturas. No es precarga de la app; conviene limpiar autofill al hacer QA manual.
- El HTML servido de `/login` contiene el formulario dos veces durante el stream (fallback de `<Suspense>` + contenido resuelto), con `id="login-email"` repetido de forma transitoria. Tras la hidratación queda un solo `<form>` y la consola no reporta warnings; se deja como observación de accesibilidad, no como fallo de criterio.
- `instant = false` y `await connection()` quedan como decisiones de la spec; el criterio 30 solo prohíbe configs de ruta y no se ven afectados.
- **Ruido solo-dev en la terminal:** cuando una sesión sin perfil entra a `/`, el layout lanza `NEXT_REDIRECT` dentro del `<Suspense>` y Next 16 registra en la **salida del servidor** `Error: Route "/" could not validate instant` / `An error occurred while attempting to validate instant UI` (traza en `app/(app)/layout.tsx:13`). No aparece en la consola del navegador (criterio 28 sigue en verde), no afecta al build de producción y solo ocurre en ese camino de error con `next dev`. Si molesta en desarrollo, el arreglo sería resolver el caso sin perfil antes de streamear el shell, algo que la spec no pide.

### Pendientes

- Ninguno bloqueante. Si el usuario lo aprueba, el `**Status:**` puede pasar a `Implementado`.
