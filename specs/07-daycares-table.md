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

- [x] `list_tables({ schemas: ["public"], verbose: true })` incluye `daycares` con 13 columnas y PK en `id`.
- [x] `list_migrations` incluye `create_daycares` y `seed_daycares_demo` además de las dos de prueba.
- [x] Existe `supabase/migrations/<version>_create_daycares.sql` y su `<version>` coincide con la de `list_migrations`.
- [x] Existe `supabase/migrations/<version>_seed_daycares_demo.sql` y su `<version>` coincide con la de `list_migrations`.
- [x] `select count(*) from public.daycares` devuelve `1`.
- [x] La fila del seed tiene `slug = 'sala-soles'`, `country = 'PE'`, `timezone = 'America/Lima'`, `locale = 'es-PE'` y `status = 'active'`.
- [x] `pg_class.relrowsecurity` es `true` para `public.daycares`.
- [x] `information_schema.role_table_grants` no devuelve filas de `anon` ni `authenticated` para `daycares`.
- [x] `pg_constraint` contiene `daycares_slug_key`, `daycares_status`, `daycares_country_code` y `daycares_slug_format`.
- [x] Existe el trigger `daycares_set_updated_at` y la función `public.set_updated_at()`.
- [x] Reaplicar el `insert` del seed a mano no crea una segunda fila (`on conflict (slug) do nothing`).
- [x] `supabase/README.md` documenta las 8 reglas del patrón.
- [x] `.env.template` contiene `SUPABASE_DB_PASSWORD` y ya no `SUPBASE_DB_PASSWORD`.
- [x] `npx tsc --noEmit` termina sin errores.
- [x] `app/` no tiene archivos modificados por esta spec.

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

## Verification report

- **Fecha de corrida:** 2026-10-26 19:36 -05:00 (los `version` de migración están en UTC y por eso figuran `20261027...`)
- **Branch:** `spec-07-daycares-table` (HEAD `5d477b5 07-daycares-tables`)
- **Punto de partida:** árbol limpio, todo el trabajo de la spec ya commiteado. No hizo falta corregir código en esta corrida.

### Comandos ejecutados

| Comando | Resultado |
| --- | --- |
| `npm run build` | exit 0. `✓ Compiled successfully in 20.6s`, `Finished TypeScript in 5.9s`, 16 páginas generadas, `ƒ Proxy (Middleware)`. |
| `npx tsc --noEmit` | exit 0, sin salida de errores. |
| `npx eslint app` | exit 0, sin errores ni warnings. |
| `git diff --name-only main...HEAD` | 5 archivos: `.env.template`, `specs/07-daycares-table.md`, `supabase/README.md` y las 2 migraciones. Ninguno en `app/`. |
| `grep -E '\b(dynamic\|revalidate\|fetchCache\|runtime)\s*[=:]'` en `app/**.{ts,tsx}` | sin coincidencias. |
| `glob **/postcss.config.*`, `**/tailwind.config.*` | sin coincidencias fuera de `node_modules`. |

### Criterios

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | `list_tables` incluye `daycares` con 13 columnas y PK en `id` | PASS | MCP devolvió 13 columnas en orden (`id, name, slug, email, phone, address, city, country, timezone, locale, status, created_at, updated_at`), `primary_keys: ["id"]`, `rls_enabled: true`. |
| 2 | `list_migrations` incluye `create_daycares` y `seed_daycares_demo` | PASS | 4 entradas: `20261027000639 create_test_table`, `20261027000755 drop_test_table`, `20261027002052 create_daycares`, `20261027002121 seed_daycares_demo`. |
| 3 | Archivo `<version>_create_daycares.sql` coincide con `list_migrations` | PASS | `supabase/migrations/20261027002052_create_daycares.sql` (44 líneas). |
| 4 | Archivo `<version>_seed_daycares_demo.sql` coincide con `list_migrations` | PASS | `supabase/migrations/20261027002121_seed_daycares_demo.sql` (4 líneas). |
| 5 | `select count(*)` devuelve `1` | PASS | `[{"total":1}]`. |
| 6 | Fila del seed con `slug/country/timezone/locale/status` | PASS | `Sala Soles / sala-soles / PE / America/Lima / es-PE / active`. |
| 7 | `pg_class.relrowsecurity` es `true` | PASS | `[{"relrowsecurity":true}]`. |
| 8 | Sin filas de `anon`/`authenticated` en `role_table_grants` | PASS | 14 filas, solo `postgres` y `service_role` (DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE). |
| 9 | `pg_constraint` con los 4 nombres | PASS | 9 constraints: `daycares_pkey`, `daycares_slug_key`, `daycares_country_code`, `daycares_email_format`, `daycares_locale`, `daycares_name_length`, `daycares_slug_format`, `daycares_status`, `daycares_timezone`. |
| 10 | Trigger `daycares_set_updated_at` y función `public.set_updated_at()` | PASS | `pg_trigger` unido a `pg_proc`: `[{"tgname":"daycares_set_updated_at","proname":"set_updated_at"}]`, función en esquema `public`. |
| 11 | Reaplicar el insert no crea una segunda fila | PASS | `count` antes `1`, insert `ON CONFLICT` ejecutado, `count` después `1`. |
| 12 | `supabase/README.md` documenta las 8 reglas | PASS | Reglas 1–8 presentes y textualmente iguales al apartado *Patrón de migraciones* de esta spec. |
| 13 | `.env.template` con `SUPABASE_DB_PASSWORD` | PASS | Contenido: `SUPABASE_DB_PASSWORD=xxxxxxxxxxxxxx`; búsqueda de `SUPBASE_DB_PASSWORD` → `False`. |
| 14 | `npx tsc --noEmit` sin errores | PASS | exit 0. |
| 15 | `app/` sin archivos modificados | PASS | `git diff --name-only main...HEAD -- app next.config.ts package.json package-lock.json tsconfig.json eslint.config.mjs proxy.ts` → vacío. |

### Contraste con documentación

- **Next.js (Context7 `/vercel/next.js` + doc vendorizada `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md`):** las variables sin prefijo `NEXT_PUBLIC_` solo existen en el servidor ("Non-`NEXT_PUBLIC_` environment variables are only available in the Node.js environment"). `SUPABASE_DB_PASSWORD` no se expone al navegador, así que el rename de `.env.template` no filtra el secreto.
- **Next.js / repo (`AGENTS.md`):** no se agregaron route configs (`dynamic`, `revalidate`, `fetchCache`, `runtime`), ni `postcss.config.*`, ni `tailwind.config.*`, ni dependencias nuevas. `cacheComponents` + `partialPrefetching` siguen intactos y el build los reporta activos.
- **Supabase (skill local + Context7 `/supabase/supabase`):** patrón de cerrar una tabla con `alter table ... enable row level security` + `revoke all ... from anon, authenticated` en la misma migración, tal como indica `docs/content/guides/database/postgres/row-level-security.mdx`. No hay policies todavía, que es la decisión de esta spec.

### Playwright

Esta spec no tiene criterios visuales ni de DOM, así que la pasada fue un smoke de regresión para confirmar que agregar `supabase/` no rompió la app, que sigue con mocks.

- `http://localhost:3000/` → 200, `scrollWidth` 1440 = `innerWidth` 1440 (sin scroll horizontal).
- `http://localhost:3000/ninos` → 200, consola: 0 errores, 0 warnings.
- Capturas: `.playwright-mcp/verify-spec07-feed-1440.png`, `.playwright-mcp/verify-spec07-ninos-1440.png`.
- `verify-spec07-feed-1440.png` contra `references/screenshots/feed.png`: sin diferencias de layout, jerarquía, colores, tipografía ni copy. La referencia está recortada a 904px de ancho, así que la comparación es de estructura, no pixel a pixel.
- En la primera carga de `/` apareció un error de hidratación de React; ver *Pendientes*.

### Archivos modificados en esta corrida

- `specs/07-daycares-table.md`: casillas marcadas y esta sección agregada.
- Nada en `app/`, `supabase/`, `.env.template` ni configuración: no hubo fallas que corregir.

### Pendientes y riesgos

- **Dev server colgado:** al empezar, el `next dev` que estaba en el puerto 3000 (PID 12528, 1.2 GB) aceptaba conexiones TCP pero no respondía HTTP ni a los 60 s. Hubo que matarlo y levantar uno nuevo. No es un criterio de esta spec, pero es una falla real de la herramienta.
- **Error de hidratación en `/` y `/ninos`:** React reporta `style={{caret-color:"transparent"}}` de más en cada `input`/`textarea`. `caret-color` no aparece en ningún archivo de `app/` y el HTML del servidor (`Invoke-WebRequest` sobre `/`, 59 486 bytes) tampoco lo contiene, pero el DOM del navegador sí lo tenía al hidratar. Firma típica de una extensión que muta los campos antes de que React cargue, que es justamente una de las causas que lista el propio mensaje de React. Queda como observación ambiental, no como deuda de la SPEC 07: si querés descartarlo del todo, hay que abrir `/` en un perfil limpio de Chrome y ver si el error desaparece.
- **`.env` local mantiene el typo:** tiene `SUPBASE_DB_PASSWORD`, no `SUPABASE_DB_PASSWORD`. El alcance de la spec solo nombraba `.env.template`, así que no falla ningún criterio; conviene corregirlo antes de la spec que conecte la app a Supabase.
- **Criterio 11 escribe en la base:** para probar idempotencia se reaplicó el insert del seed por MCP. Fue inocuo por el `on conflict`, pero deja una escritura en el historial de la corrida.
- **No hay `config.toml`:** si mañana se adopta la CLI, `supabase migration list` puede reportar las 2 migraciones de prueba (`create_test_table`, `drop_test_table`) que nunca tuvieron archivo en el repo. Habría que decidir si se reviran o se documentan como excepción.
- **La tabla sigue inalcanzable desde el frontend:** es la decisión tomada. La spec de auth trae policies y grants.
