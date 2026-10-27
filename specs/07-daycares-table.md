# SPEC 07 — Primera tabla `daycares` y patrón de migraciones

> **Status:** Aprovado
> **Depends on:** Ninguna
> **Date:** 2026-10-26
> **Objective:** Crear `public.daycares` en Supabase con RLS cerrado y un seed demo, versionando cada cambio en `supabase/migrations/` y aplicándolo con el MCP para que el remoto y el repo coincidan.

## Por qué existe esta spec

- Es el primer cambio de esquema real del producto. Hoy `public` está vacío y todas las pantallas usan mocks en `app/_data/`.
- Fija el patrón de migraciones que van a repetir `rooms`, `children`, `parents`, `posts` e `invitations`.
- El proyecto se administra por MCP, sin CLI ni Docker local. Sin un patrón escrito, cada tabla futura va a terminar aplicada con SQL suelto y sin historial en git.

## Scope

**In:**

- `supabase/migrations/<version>_create_daycares.sql`: tabla `public.daycares`, constraints, función `public.set_updated_at()`, trigger y cierre de RLS/grants.
- `supabase/migrations/<version>_seed_daycares_demo.sql`: fila de `Sala Soles` idempotente.
- `supabase/README.md`: reglas del patrón de migraciones (versión del servidor, `apply_migration`, verificación).
- Aplicar las dos migraciones al proyecto remoto con el MCP `apply_migration`.
- `.env.template`: corregir `SUPBASE_DB_PASSWORD` → `SUPABASE_DB_PASSWORD`.

**Out of scope (para specs futuras):**

- Tipos TypeScript generados, `supabase-js`, `@supabase/ssr` o cualquier cliente en la app.
- Reemplazar los mocks de `app/_data/children.ts` (`room`, `children`) por consultas reales.
- Tablas hijas: `rooms`, `children`, `parents`, `posts`, `invitations`.
- `auth.users`, `owner_id`, membresías o multi-tenant.
- Policies de lectura o escritura para `anon`/`authenticated`; la tabla queda inaccesible para el frontend.
- Subida de logo o uso de Storage.
- Más daycares en el seed, datos de contacto ficticios.
- `supabase init`, `config.toml`, Supabase CLI, Docker local o `db push`.
- Cambios en `proxy.ts`, rutas, componentes o pantallas.

## Data model

```sql
-- supabase/migrations/<version>_create_daycares.sql
create table public.daycares (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  email      text,
  phone      text,
  address    text,
  city       text,
  country    text not null,
  timezone   text not null,
  locale     text not null,
  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint daycares_slug_key unique (slug),
  constraint daycares_name_length  check (char_length(btrim(name)) between 2 and 120),
  constraint daycares_slug_format  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint daycares_email_format check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint daycares_country_code check (country ~ '^[A-Z]{2}$'),
  constraint daycares_timezone     check (char_length(btrim(timezone)) > 0),
  constraint daycares_locale       check (char_length(btrim(locale)) > 0),
  constraint daycares_status       check (status in ('active', 'inactive'))
);
```

Convenciones:

- `id`: `uuid` con `gen_random_uuid()` (core desde PostgreSQL 13). No hay ids legibles.
- `slug`: kebab-case, único por constraint; es la clave estable para URLs y seeds.
- `country`: ISO-3166 alpha-2 en mayúsculas (`PE`).
- `timezone`: nombre IANA (`America/Lima`), no offset.
- `locale`: BCP-47 (`es-PE`).
- `status`: `active | inactive`. No hay borrado lógico ni estados intermedios todavía.
- `email`, `phone`, `address`, `city`: opcionales; el seed no inventa datos de contacto.
- `created_at` / `updated_at`: `timestamptz`, siempre en UTC; la zona del negocio vive en `timezone`.
- Sin `deleted_at`: baja = `status = 'inactive'`.

Trigger:

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger daycares_set_updated_at
before update on public.daycares
for each row execute function public.set_updated_at();
```

RLS y grants:

```sql
alter table public.daycares enable row level security;
revoke all on table public.daycares from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant all on table public.daycares to service_role;
```

Seed:

```sql
-- supabase/migrations/<version>_seed_daycares_demo.sql
insert into public.daycares (name, slug, country, timezone, locale, status)
values ('Sala Soles', 'sala-soles', 'PE', 'America/Lima', 'es-PE', 'active')
on conflict (slug) do nothing;
```

## Patrón de migraciones

Reglas que quedan fijadas para todas las tablas siguientes:

1. La fuente de verdad es `supabase/migrations/<version>_<slug>.sql`, commiteado.
2. `<version>` es el que devuelve el MCP `apply_migration` (`YYYYMMDDHHMMSS`). Si la respuesta no lo incluye, se lee inmediatamente de `list_migrations`.
3. `<slug>` en `snake_case` descriptivo: `create_daycares`, `seed_daycares_demo`.
4. Todo DDL se aplica con `apply_migration`, nunca con `execute_sql` suelto.
5. `execute_sql` queda para consultas de solo lectura y verificación.
6. Cada migración debe poder re-aplicarse sin romper: `create or replace` en funciones, `on conflict do nothing` en seeds.
7. Después de cada `apply_migration` se verifica con `list_migrations` y `list_tables({ schemas: ["public"], verbose: true })`.
8. No se agrega `config.toml` hasta que el proyecto adopte la CLI; en ese momento se corre `supabase link` y `supabase migration list` para comparar versiones.

## Implementation plan

1. Registrar el baseline remoto: `list_tables({ schemas: ["public"], verbose: true })` debe devolver `[]` y `list_migrations` las dos migraciones de prueba.
2. Aplicar `create_daycares` con `apply_migration({ name: "create_daycares", query })` y anotar el `version` devuelto.
3. Crear `supabase/migrations/<version>_create_daycares.sql` con exactamente el SQL aplicado en el paso 2.
4. Verificar con `list_tables(verbose)` que `daycares` tenga las 13 columnas, PK en `id` y la unique de `slug`; consultar `pg_class.relrowsecurity` e `information_schema.role_table_grants` con `execute_sql`.
5. Aplicar `seed_daycares_demo` con `apply_migration` y anotar el `version`.
6. Crear `supabase/migrations/<version>_seed_daycares_demo.sql` con el `insert`.
7. Verificar con `execute_sql` que `select id, name, slug, country, timezone, locale, status from public.daycares` devuelve una fila `sala-soles`.
8. Escribir `supabase/README.md` con las 8 reglas del patrón.
9. Corregir `.env.template` a `SUPABASE_DB_PASSWORD=xxxxxxxxxxxxxx`.
10. Correr `npx tsc --noEmit` para confirmar que no hubo regresión en la app (no se toca código de la app).

## Acceptance criteria

- [ ] `list_tables({ schemas: ["public"], verbose: true })` incluye `daycares` con 13 columnas y PK en `id`.
- [ ] `list_migrations` incluye `create_daycares` y `seed_daycares_demo` además de las dos de prueba.
- [ ] Existe `supabase/migrations/<version>_create_daycares.sql` y su `<version>` coincide con la de `list_migrations`.
- [ ] Existe `supabase/migrations/<version>_seed_daycares_demo.sql` y su `<version>` coincide con la de `list_migrations`.
- [ ] `select count(*) from public.daycares` devuelve `1`.
- [ ] La fila del seed tiene `slug = 'sala-soles'`, `country = 'PE'`, `timezone = 'America/Lima'`, `locale = 'es-PE'` y `status = 'active'`.
- [ ] `pg_class.relrowsecurity` es `true` para `public.daycares`.
- [ ] `information_schema.role_table_grants` no devuelve filas de `anon` ni `authenticated` para `daycares`.
- [ ] `pg_constraint` contiene `daycares_slug_key`, `daycares_status`, `daycares_country_code` y `daycares_slug_format`.
- [ ] Existe el trigger `daycares_set_updated_at` y la función `public.set_updated_at()`.
- [ ] Reaplicar el `insert` del seed a mano no crea una segunda fila (`on conflict (slug) do nothing`).
- [ ] `supabase/README.md` documenta las 8 reglas del patrón.
- [ ] `.env.template` contiene `SUPABASE_DB_PASSWORD` y ya no `SUPBASE_DB_PASSWORD`.
- [ ] `npx tsc --noEmit` termina sin errores.
- [ ] `app/` no tiene archivos modificados por esta spec.

## Decisions

- **Sí:** alcance solo base de datos. La app sigue con mocks hasta una spec de integración con `supabase-js`.
- **Sí:** archivo local + `apply_migration`. Deja historial en git y hace que el remoto y el repo coincidan usando el mismo `version`.
- **Sí:** `text` + `check` para `status` en vez de enum. Cambiar un enum requiere migración aparte; un check se ajusta en una línea.
- **Sí:** RLS habilitado sin policies + `revoke all`. Supabase concede privilegios por defecto a `anon`/`authenticated`; revocar es explícito y no depende de la configuración del dashboard.
- **Sí:** seed en migración separada. Permite omitirlo al promover a producción sin editar la migración de la tabla.
- **Sí:** `gen_random_uuid()` en vez de `uuid_generate_v4()`. Es core y evita la extensión `uuid-ossp`.
- **Sí:** `updated_at` con trigger reutilizable. Una sola función para todas las tablas futuras.
- **Sí:** `country` ISO-3166 alpha-2 y `timezone` IANA. Evita strings libres y offsets.
- **No:** `citext` para `email`. El check de formato alcanza y no agrega extensión.
- **No:** `config.toml` / `supabase init`. Agrega CLI, Docker y manejo de tokens sin beneficio mientras todo se haga por MCP.
- **No:** policy de lectura pública. Sin auth todavía, cualquier policy es una decisión de seguridad prematura.
- **No:** `owner_id` / `auth.users`. Va con la spec de autenticación y membresías.
- **No:** tipos TypeScript generados. Se generan cuando exista consumo real desde la app.

## Risks

| Risk | Mitigation |
| --- | --- |
| `apply_migration` devuelve un `version` distinto al esperado | Nombrar el archivo con el `version` devuelto; si falta, leerlo de `list_migrations` antes de crearlo. |
| El remoto queda aplicado pero el archivo no se crea (drift) | El paso 3 es obligatorio antes de verificar; la acceptance compara archivo y `list_migrations`. |
| La tabla no es accesible desde el frontend | Es intencional. La spec de auth define policies y grants. |
| `set_updated_at` choca con una función futura | `create or replace` y nombre genérico documentado en `supabase/README.md`. |
| El seed demo llega a producción | Vive en migración separada; se omite al promover. |
| `gen_random_uuid()` no existe en una instancia vieja | Verificar `select version()`; Supabase corre PostgreSQL 15+. |

## What is **not** in this spec

- Conexión de la app a Supabase (cliente, tipos, queries).
- Auth, `owner_id` y policies por usuario.
- Tablas de niños, padres, salas, publicaciones o invitaciones.
- Datos de contacto del seed.
- CLI local, Docker o `config.toml`.

Cada uno de esos, si llega, va en su propia spec.
