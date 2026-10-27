# Migraciones de Supabase

Este proyecto administra el esquema de Supabase por MCP. No hay Supabase CLI, Docker local ni `config.toml`.

## Reglas

1. La fuente de verdad es `supabase/migrations/<version>_<slug>.sql`, commiteado.
2. `<version>` es el que devuelve el MCP `apply_migration` (`YYYYMMDDHHMMSS`). Si la respuesta no lo incluye, se lee inmediatamente de `list_migrations`.
3. `<slug>` en `snake_case` descriptivo: `create_daycares`, `seed_daycares_demo`.
4. Todo DDL se aplica con `apply_migration`, nunca con `execute_sql` suelto.
5. `execute_sql` queda para consultas de solo lectura y verificación.
6. Cada migración debe poder re-aplicarse sin romper: `create or replace` en funciones, `on conflict do nothing` en seeds.
7. Después de cada `apply_migration` se verifica con `list_migrations` y `list_tables({ schemas: ["public"], verbose: true })`.
8. No se agrega `config.toml` hasta que el proyecto adopte la CLI; en ese momento se corre `supabase link` y `supabase migration list` para comparar versiones.

## Receta para una tabla nueva

1. Escribir el SQL en memoria: tabla, constraints, RLS y grants en el mismo bloque.
2. Ejecutar `apply_migration({ name: "<slug>", query })`.
3. Anotar el `version` con `list_migrations`.
4. Crear `supabase/migrations/<version>_<slug>.sql` con ese mismo SQL.
5. Verificar columnas, PK, constraints, `relrowsecurity` y grants con `list_tables` y `execute_sql`.
6. Si hay datos demo, aplicar una migración separada `seed_<tabla>_demo` con `on conflict ... do nothing`.

## Seguridad por defecto

- Toda tabla nueva en `public` habilita RLS.
- `anon` y `authenticated` no reciben grants hasta que exista una policy que los justifique.
- `service_role` mantiene acceso completo para el backend y el MCP.
- Las policies por usuario llegan con la spec de autenticación, no antes.

## Enums

- Cada enum vive en `public` y se crea en su propia migración `create_<nombre>_enums`, antes de la tabla que lo usa.
- `create type` no soporta `if not exists`. Usar una guarda sobre `pg_type` + `pg_namespace` para que la migración se pueda re-aplicar.
- Cerrar `USAGE` igual que las tablas: `revoke all on type ... from public, anon, authenticated;` y `grant usage on type ... to service_role;`.
- Los labels van en inglés y en orden estable; la traducción vive en la UI.
- Para agregar un valor alcanza `alter type ... add value`; quitar o renombrar un label requiere recrear el tipo.

```sql
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
end
$$;

revoke all on type public.user_role from public, anon, authenticated;
grant usage on type public.user_role to service_role;
```

## Auth

- Las credenciales viven en `auth.users`; `public.users` guarda solo el perfil y comparte el UUID con `auth.users(id)` (`users_auth_fkey`, `on delete cascade`).
- El usuario demo se siembra por migración con el UUID fijo `d3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d`, email confirmado y contraseña hasheada con `extensions.crypt`. Insertar en `auth.users` y `auth.identities` no es API pública de Supabase: si una actualización de GoTrue cambia el esquema, el login real lo detecta y el plan B es crear el usuario desde el Dashboard y ajustar el perfil.
- El rol `authenticated` solo puede leer su propia fila de `public.users`; `anon` sigue sin grants.
- `USAGE` de los enums se concede a `authenticated` junto con la policy, porque PostgREST lo necesita para serializar `role` y `status`.

```sql
-- Perfil propio
drop policy if exists users_select_own on public.users;

create policy users_select_own
on public.users
for select
to authenticated
using (id = (select auth.uid()));

grant select on table public.users to authenticated;
grant usage on type public.user_role, public.user_status to authenticated;
```

- La app nunca usa `service_role`: el seed y las policies se aplican con el MCP, no desde `app/`.

## Comprobaciones útiles

```sql
-- RLS
select relrowsecurity from pg_class
where oid = 'public.daycares'::regclass;

-- Grants de los roles del Data API
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'daycares';

-- Constraints
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.daycares'::regclass
order by conname;

-- Privilegios de un enum
select has_type_privilege('anon', 'public.user_role', 'usage');
```
