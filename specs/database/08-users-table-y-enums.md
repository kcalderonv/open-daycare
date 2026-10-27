# SPEC 08 — Tabla `users` y enums `user_role` / `user_status`

> **Status:** Aprovado
> **Depends on:** SPEC 07
> **Date:** 2026-10-26
> **Objective:** Crear `public.users` con los enums `user_role` y `user_status`, el vínculo 1:N con `daycares` y un usuario demo `Caro Rojas` en `sala-soles`, versionado en `supabase/migrations/` y aplicado por MCP.

## Por qué existe esta spec

- SPEC 07 dejó `public` con una sola tabla (`daycares`) y fijó el patrón de migraciones. `users` es la segunda tabla y la primera con enums.
- El diccionario `07-DB-Schema/opendaycare-database-schema.md` define `user_role`, `user_status` y la forma de `users`; esta spec los materializa sin reinterpretarlos.
- Hoy no hay autenticación ni usuario en Supabase Auth (0 filas en `auth.users`). Sin un usuario demo en `public.users` no hay contra qué probar las consultas de las próximas specs.
- Los otros cuatro enums del diccionario (`relationship_type`, `invitation_status`, `post_type`, `child_status`) van a repetir el mismo patrón; esta spec lo deja escrito en `supabase/README.md`.

## Scope

**In:**

- `supabase/migrations/<version>_create_user_enums.sql`: `public.user_role` (`admin`, `staff`, `parent`) y `public.user_status` (`pending`, `active`), cada uno con guarda de re-aplicación.
- `supabase/migrations/<version>_create_users.sql`: tabla `public.users` con sus constraints, FK a `public.daycares`, índice de consulta, trigger de `updated_at`, RLS cerrado y grants explícitos.
- `supabase/migrations/<version>_seed_users_demo.sql`: fila `Caro Rojas` (`admin`, `active`) vinculada a `sala-soles` con UUID fijo e idempotente.
- Aplicar las tres migraciones al proyecto remoto con el MCP `apply_migration`.
- `supabase/README.md`: nueva sección **Enums** con la guarda de `create type`, el orden de aplicación y la revocación de `USAGE` a `anon`/`authenticated`.

**Out of scope (para specs futuras):**

- `id` como FK a `auth.users`, trigger `AFTER INSERT` en `auth.users` y sincronización con `raw_user_meta_data`.
- Email, contraseña, confirmación de correo o cualquier columna duplicada de `auth.users`.
- Policies para `anon`/`authenticated`, lectura del usuario propio o lectura por daycare.
- Tabla `parents` separada: los padres son filas de `users` con `role = 'parent'`.
- Tabla intermedia `daycare_members`: un usuario pertenece a un solo daycare.
- `rooms`, `children`, `parent_children`, `invitations`, `posts` y sus enums.
- `supabase-js`, `@supabase/ssr`, tipos TypeScript generados o cualquier consumo desde `app/`.
- Avatar real en Storage, `avatar_url` con archivo subido o datos de contacto.
- Cambios en `proxy.ts`, rutas, componentes, `package.json` o configuración de Next.js.

## Data model

### Enums

```sql
-- supabase/migrations/<version>_create_user_enums.sql
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role' and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('admin', 'staff', 'parent');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_status' and n.nspname = 'public'
  ) then
    create type public.user_status as enum ('pending', 'active');
  end if;
end
$$;
```

Convenciones:

- Los enums viven en `public`, no en `auth` ni en un esquema propio.
- El orden de los labels es estable: `admin < staff < parent` y `pending < active`.
- Los valores van en inglés; la traducción a español vive en la UI.
- `create type` no soporta `if not exists`; la guarda con `pg_type` cumple la regla 6 de `supabase/README.md`.

### Tabla `users`

```sql
-- supabase/migrations/<version>_create_users.sql
create table public.users (
  id                    uuid primary key default gen_random_uuid(),
  daycare_id            uuid not null,
  role                  public.user_role not null,
  status                public.user_status not null default 'active',
  full_name             text not null,
  avatar_url            text,
  notify_on_post        boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint users_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint users_full_name_length check (char_length(btrim(full_name)) between 2 and 120),
  constraint users_avatar_url_length check (avatar_url is null or char_length(btrim(avatar_url)) > 0)
);

create index users_daycare_id_role_idx on public.users (daycare_id, role);

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();
```

Convenciones:

- `id`: `uuid` con `gen_random_uuid()`. En la spec de auth pasa a ser FK a `auth.users(id)`; por eso el seed usa un UUID fijo.
- `daycare_id`: obligatorio. Relación 1:N; un daycare tiene muchos usuarios, un usuario pertenece a uno solo.
- `role`: enum `user_role`, sin default. El rol siempre se declara al crear el usuario.
- `status`: `pending | active`, default `active`. El estado previo al signup se modela en `invitations`, no acá.
- `full_name`: `text` con largo 2–120, igual que `daycares.name`.
- `avatar_url`: nullable y opcional; solo se valida que no sea vacío, no el formato (puede ser URL o ruta relativa).
- `notify_on_post` y `daily_summary_enabled`: booleanos default `true`, tal como el diccionario.
- `created_at` / `updated_at`: `timestamptz` en UTC. Reutiliza `public.set_updated_at()` de SPEC 07; no se re-crea la función.
- `on delete restrict`: borrar un daycare con usuarios falla; la baja se hace con `daycares.status = 'inactive'`.
- Sin `email`: vive en `auth.users` y duplicarlo genera drift.
- Sin `deleted_at`: baja = `status` o borrado físico, según decida la spec de auth.

### RLS, grants y tipos

```sql
alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated;
grant all on table public.users to service_role;
revoke all on type public.user_role, public.user_status from public, anon, authenticated;
grant usage on type public.user_role, public.user_status to service_role;
```

Sin policies todavía. Los tipos se cierran también porque por defecto `USAGE` se concede a `PUBLIC`; la spec de auth vuelve a concederlos junto con las policies.

### Seed demo

```sql
-- supabase/migrations/<version>_seed_users_demo.sql
insert into public.users (id, daycare_id, role, status, full_name)
select
  'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d'::uuid,
  d.id,
  'admin'::public.user_role,
  'active'::public.user_status,
  'Caro Rojas'
from public.daycares d
where d.slug = 'sala-soles'
on conflict (id) do nothing;
```

Convenciones:

- El UUID fijo es el ancla de idempotencia y el que la spec de auth reutiliza al crear el usuario real.
- `on conflict (id)` evita inventar un `unique` de negocio sobre `full_name`, que en la vida real se repite.
- El seed depende de `sala-soles` (SPEC 07); si el slug cambia, inserta 0 filas y la verificación lo detecta.

## Implementation plan

1. Registrar el baseline remoto: `list_tables({ schemas: ["public"], verbose: true })` debe devolver solo `daycares` y `list_migrations` las 4 migraciones actuales.
2. Aplicar `create_user_enums` con `apply_migration` y anotar el `version` devuelto.
3. Crear `supabase/migrations/<version>_create_user_enums.sql` con el bloque de enums exactamente como se aplicó.
4. Verificar con `execute_sql` que `pg_type` lista los dos tipos en `public` y que `enum_range(null::public.user_role)` devuelve `{admin,staff,parent}`.
5. Aplicar `create_users` con `apply_migration` y anotar el `version`.
6. Crear `supabase/migrations/<version>_create_users.sql` con tabla, índice, trigger, RLS, grants y revokes de tipos.
7. Verificar con `list_tables(verbose)` las 10 columnas, PK en `id` y FK `users_daycare_fkey`; con `execute_sql`, `relrowsecurity`, `information_schema.role_table_grants`, `has_type_privilege` y `pg_trigger`.
8. Aplicar `seed_users_demo` con `apply_migration` y anotar el `version`.
9. Crear `supabase/migrations/<version>_seed_users_demo.sql` con el `insert`.
10. Verificar con `execute_sql` que hay una sola fila, `full_name = 'Caro Rojas'`, `role = 'admin'`, `status = 'active'` y `daycare_id` apunta a `sala-soles`.
11. Comprobar idempotencia dentro de una transacción con `rollback`: re-ejecutar el `insert` deja el conteo en 1 y no borra ni duplica nada.
12. Agregar la sección **Enums** a `supabase/README.md` con la guarda de `create type` y el cierre de `USAGE`.
13. Correr `npx tsc --noEmit` y `git diff --name-only` para confirmar que `app/` y la configuración no cambiaron.

## Acceptance criteria

- [ ] `list_tables({ schemas: ["public"], verbose: true })` incluye `users` con 10 columnas y PK en `id`.
- [ ] `users` tiene la FK `users_daycare_fkey` hacia `public.daycares(id)` con `on delete restrict`.
- [ ] `enum_range(null::public.user_role)` devuelve exactamente `{admin,staff,parent}` y `enum_range(null::public.user_status)` devuelve `{pending,active}`.
- [ ] `pg_type` + `pg_namespace` confirman que ambos tipos están en el esquema `public`.
- [ ] `select count(*) from public.users` devuelve `1`.
- [ ] La fila del seed tiene `id = 'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d'`, `full_name = 'Caro Rojas'`, `role = 'admin'`, `status = 'active'` y `daycare_id` igual al `id` de `sala-soles`.
- [ ] Re-ejecutar el `insert` del seed dentro de una transacción con `rollback` deja el conteo en `1`.
- [ ] `pg_class.relrowsecurity` es `true` para `public.users`.
- [ ] `information_schema.role_table_grants` no devuelve filas de `anon` ni `authenticated` para `users`.
- [ ] `has_type_privilege('anon', 'public.user_role', 'usage')` y `has_type_privilege('authenticated', 'public.user_role', 'usage')` devuelven `false`; para `service_role` devuelven `true`.
- [ ] Existe el trigger `users_set_updated_at` apuntando a `public.set_updated_at()`.
- [ ] Un `update` sobre el usuario demo cambia `updated_at` a un valor mayor que `created_at`.
- [ ] Intentar borrar el daycare `sala-soles` dentro de una transacción con `rollback` falla por la FK.
- [ ] Los tres archivos `supabase/migrations/<version>_*.sql` existen y sus `<version>` coinciden con `list_migrations`.
- [ ] `supabase/README.md` documenta la sección **Enums** con la guarda y el cierre de `USAGE`.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `git diff --name-only` no muestra archivos de `app/`, `package.json`, `package-lock.json`, `next.config.ts` ni `proxy.ts`.

## Decisions

- **Sí:** `users` sin FK a `auth.users` en esta spec. Hoy `auth.users` está vacío y no hay cliente de Auth; insertar filas a mano en el esquema `auth` es frágil. La spec de auth agrega la FK y el trigger.
- **Sí:** UUID fijo en el seed. Permite idempotencia sin un `unique` de negocio y deja el id listo para enlazar el futuro usuario de Auth.
- **Sí:** ENUM nativos en `public`, como pide el diccionario y el pedido explícito. Se diferencia de `daycares.status` (text + check) porque estos tipos son parte del contrato de datos del producto.
- **Sí:** guarda con `pg_type` en vez de `create type if not exists`. Es la única forma de cumplir la regla de re-aplicación.
- **Sí:** 1:N con `daycare_id not null` + `on delete restrict`. Un usuario pertenece a un solo daycare; la baja del daycare es lógica.
- **Sí:** índice `(daycare_id, role)`. Cubre el listado por daycare y el filtro posterior por rol con un solo índice.
- **Sí:** RLS cerrado sin policies y `revoke` de `USAGE` en los tipos. No hay auth todavía; cualquier policy sería una decisión de seguridad prematura.
- **Sí:** reutilizar `public.set_updated_at()`. Ya existe desde SPEC 07 y no se duplica.
- **Sí:** documentar el patrón de enums en `supabase/README.md`. Quedan cuatro enums por crear y el idiom de la guarda no es obvio.
- **No:** tabla `parents` separada. El diccionario unifica padres y staff en `users` con `role`.
- **No:** `daycare_members` (N:M). Agranda el modelo sin un caso de uso real.
- **No:** columna `email` o `password_hash`. Supabase Auth ya las gestiona.
- **No:** policies de lectura propia o por daycare. Llegan con la spec de autenticación.
- **No:** tipos TypeScript generados ni `supabase-js`. La app sigue con mocks.
- **No:** trigger `AFTER INSERT` en `auth.users`. No hay auth ni usuarios en Auth.

## Risks

| Risk | Mitigation |
| --- | --- |
| El seed no inserta nada si `sala-soles` no existe | El `insert` selecciona por `slug`; el criterio de conteo `= 1` lo detecta antes de cerrar la spec. |
| La spec de auth no puede agregar la FK porque el usuario demo no existe en `auth.users` | El UUID del seed es fijo y está documentado: el usuario de Auth se crea con ese mismo id. |
| Revocar `USAGE` de los tipos rompe una lectura futura desde el Data API | Es intencional y está documentado; la spec de auth vuelve a conceder `USAGE` junto con las policies. |
| Cambiar un label de enum requiere recrear el tipo y migrar datos | Los labels se confirman antes de aplicar; para agregar valores alcanza `alter type ... add value`. |
| `create type` dentro de `do $$` falla en una base sin permisos de DDL | Se aplica con `apply_migration`, que corre como `postgres`. |
| El trigger `users_set_updated_at` choca con un nombre futuro | Nombre prefijado por tabla, igual que `daycares_set_updated_at`. |
| El seed demo llega a producción | Vive en una migración separada y se omite al promover, como en SPEC 07. |

## What is **not** in this spec

- Auth real, `auth.users`, FK, trigger de signup, sesión o cookies.
- Policies de RLS para `anon`/`authenticated`.
- `parents` como tabla aparte y `daycare_members`.
- Los enums `relationship_type`, `invitation_status`, `post_type` y `child_status`.
- `children`, `rooms`, `parent_children`, `invitations`, `posts`, `comments`, `reactions`.
- Tipos TypeScript, `supabase-js` o cualquier cambio en `app/`.
- Storage, avatares subidos y datos de contacto del seed.

Cada uno de esos, si llega, va en su propia spec.
