# Migraciones de Supabase

Este proyecto administra el esquema de Supabase por MCP. No se usa la CLI para migraciones, ni Docker local, ni `config.toml`; la CLI solo sirve para login y generación de tipos (ver el README raíz).

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
- El usuario demo se siembra por migración con el UUID fijo `d3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d`, email confirmado y contraseña hasheada con `extensions.crypt`. El seed original crea `Caro Rojas`; la migración `rename_demo_user` lo deja como `Kevin Calderon` / `kevin07cv2008@gmail.com` conservando el UUID y la contraseña. Insertar en `auth.users` y `auth.identities` no es API pública de Supabase: si una actualización de GoTrue cambia el esquema, el login real lo detecta y el plan B es crear el usuario desde el Dashboard y ajustar el perfil.
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

## Niños y salas

- `public.rooms` guarda las salas de cada daycare (`Soles`, `Lunas`, `Estrellas` en el seed). `position` fija el orden de la UI; `slug` es la clave estable y única por daycare.
- `public.children` guarda `daycare_id` (obligatorio) y `room_id` (nullable). La FK es compuesta: `(room_id, daycare_id) → rooms(id, daycare_id)`, así un niño no puede quedar en una sala de otra guardería.
- `enrolled_at` default `current_date`, `photo_consent` default `true` y `status` default `active`: el alta desde la app no los envía.
- `allergy_tags` es `text[]` en inglés (`peanut`, `lactose`, …); la UI traduce y guarda sinónimos desde el formulario.
- Acceso: `admin` y `staff` del mismo daycare leen niños y salas, y pueden insertar y actualizar niños. `rooms` es de solo lectura desde la app. Los padres no ven niños hasta que exista `parent_children`.
- No hay policy ni grant de `DELETE`: la baja lógica (`status = 'archived'`) va en su propia spec.
- **Cuidado con las policies:** la referencia al daycare debe ir calificada (`children.daycare_id`, `rooms.daycare_id`). Un `daycare_id` sin prefijo dentro del subquery resuelve a `users.daycare_id` y la policy deja de filtrar entre guarderías.
- Las policies de niños dependen de `users_select_own` (SPEC 09). Si esa policy cambia, hay que revisar `children_select_staff`, `children_insert_staff` y `children_update_staff`.

```sql
-- Salas de un daycare, en orden de UI
select name, slug, position
from public.rooms
where daycare_id = (select id from public.daycares where slug = 'sala-soles')
order by position, name;

-- Acceso efectivo del rol del Data API
select has_table_privilege('authenticated', 'public.children', 'insert') as puede_insertar,
       has_table_privilege('anon', 'public.children', 'select') as anon_lee;
```

## Invitaciones y vínculo de padres

- `public.invitations` guarda la invitación con su código de 5 caracteres (alfabeto sin `0/O/1/I/L`, ~28M combinaciones), vigencia de 7 días y `sent_at` como marca de entrega a Resend.
- Una sola invitación pendiente por niño y email: el índice único parcial `invitations_pending_child_email_key` cubre `(child_id, lower(email)) where status = 'pending'`. Como `now()` no es inmutable, la app normaliza las vencidas antes de insertar.
- `public.parent_children` es el vínculo real. Lo crea `accept_invitation`, no la app: `authenticated` no tiene `insert` sobre la tabla.
- El tramo anónimo usa `get_invitation_preview(code)` (`security definer`, grant a `anon`). `accept_invitation(code)` exige sesión y valida que el email del JWT coincida con el de la invitación.
- `email_has_account(email)` es de staff y evita invitar a un email que ya tiene cuenta.
- La app sigue sin usar `service_role`: el alta del padre es `signUp` con la sesión anónima y el vínculo lo hace la función definer.
- **Requisito de Auth:** "Confirm email" desactivado (Authentication → Sign In / Providers → Email). Sin eso `signUp` no devuelve sesión y la activación termina en el mensaje genérico.
- **Resend:** `RESEND_API_KEY` y `RESEND_FROM_EMAIL`. Con `onboarding@resend.dev` solo se entrega al email de la cuenta de Resend; para cualquier destinatario hay que verificar un dominio.

```sql
-- Invitaciones de un niño
select code, email, status, expires_at, sent_at
from public.invitations
where child_id = '<uuid>'
order by created_at desc;

-- Vínculos reales
select u.full_name, pc.relationship, pc.created_at
from public.parent_children pc
join public.users u on u.id = pc.parent_id
where pc.child_id = '<uuid>';
```

## Publicaciones y fotos

- `public.posts` guarda la publicación (`daycare_id`, `author_id`, `room_id` nullable, `type`, `body`, `published_at`). `title` existe por el diccionario y la app nunca lo escribe.
- `public.post_children` es el snapshot de destinatarios y el driver del feed del padre. `public.post_photos` guarda metadatos (`storage_path`, `width`, `height`, `position`), no URLs.
- Los 7 tipos viven en el enum `public.post_type` (`meal`, `nap`, `activity`, `achievement`, `mood`, `photo`, `announcement`).
- Acceso: `admin` y `staff` del mismo daycare leen y crean. Un padre ve los posts que etiquetan a sus hijos **y** los posts `room_wide` de la sala de sus hijos. No hay policy de `UPDATE` ni `DELETE`.
- **Toda la sala** se guarda con `room_id` + `room_wide = true` + `post_children` de todos los niños activos de la sala. Un subconjunto guarda `room_wide = false` y llega solo a los seleccionados. La RPC exige el snapshot exacto solo cuando `room_wide = true`; si la sala cambia mientras se escribe, falla con `room_audience_mismatch`.
- `create_post(type, room_id, room_wide, body, child_ids, photos)` es `security invoker` y escribe las tres tablas en una transacción. El autor y el daycare salen de `auth.uid()` y de `current_staff_daycare_id()`, nunca del cliente.
- La RPC rechaza `body` fuera de 10–600, salas o niños de otra guardería, más de 4 fotos, paths fuera de `{daycare_id}/{author_id}/` y fotos cuando algún niño tiene `photo_consent = false`.
- `post_is_own(post_id, daycare_id)` es `security definer` y existe para que las policies de insert de `post_children` y `post_photos` no consulten `posts` directamente: `posts_select_parent` consulta `post_children` y Postgres entra en recursión.
- Bucket `post-photos`: **privado**, 5 MB por archivo y solo `image/jpeg`, `image/png`, `image/webp`. La ruta es `{daycare_id}/{author_id}/{file_id}.{ext}`. La app firma las URLs con `createSignedUrls` (1 h) y usa `<img>` nativo.
- El cliente re-encodea a WebP ≤2048 px antes de subir: descarta EXIF/GPS y entrega `width`/`height`. El archivo original nunca sale del navegador.
- `children.photo_consent` default `true`: la app respeta el flag, pero todavía no existe una pantalla para capturarlo.

```sql
-- Feed de un daycare (staff)
select p.id, p.type, p.body, p.published_at, u.full_name as author
from public.posts p
join public.users u on u.id = p.author_id
where p.daycare_id = '<uuid>'
order by p.published_at desc
limit 20;

-- Objetos del bucket
select name, owner_id, metadata
from storage.objects
where bucket_id = 'post-photos'
order by created_at desc;
```

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
