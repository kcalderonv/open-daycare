# SPEC 12 — Publicaciones con fotos y feed real

> **Status:** Aprovado
> **Depends on:** SPEC 06, SPEC 09, SPEC 10, SPEC 11
> **Date:** 2026-10-27
> **Objective:** Persistir las publicaciones del staff con hasta cuatro fotos en un bucket privado y reemplazar el feed mock por el feed real de la guardería.

## Por qué existe esta spec

- SPEC 06 dejó el modal de "Nueva publicación" completo pero hueco: "Publicar" valida y cierra, las previews son `blob:` y no se escribe nada.
- SPEC 01 dejó el feed con 3 posts mock y `app/_data/feed.ts` como única fuente. El saludo ya es real desde SPEC 09, pero las publicaciones, la audiencia y el resumen ("12 niños · martes 17 jun") siguen mintiendo.
- El diccionario `07-DB-Schema` define `posts`, `post_children` y `post_photos`, pero ninguna existe en la base. SPEC 10 dejó las publicaciones explícitamente fuera.
- Es la primera feature con binarios de niños. La privacidad no se resuelve con una URL pública: exige bucket privado, RLS y URLs firmadas.
- Es la primera escritura de la app que necesita atomicidad entre tres tablas. Un post sin audiencia o sin fotos es peor que un error.

## Estado remoto de partida (verificado el 2026-10-27)

- `public`: `daycares` (1, `Sala Soles`), `users` (1, `Kevin Calderon`, `admin`, `active`), `rooms` (3: Soles, Lunas, Estrellas), `children` (1: `Harly Calderon`, Soles, `peanut`), `invitations` (0), `parent_children` (0).
- No existen `posts`, `post_children`, `post_photos` ni el enum `post_type`.
- `storage.buckets` está vacío: no hay ningún bucket.
- `children` ya tiene `children_id_daycare_key unique (id, daycare_id)` (SPEC 11).
- `users` no tiene `room_id` y no lo va a tener: la sala es del niño.
- Solo hay una cuenta real (`admin`). No existe ninguna cuenta `staff` ni ningún padre vinculado.

## Scope

**In:**

- `supabase/migrations/<version>_create_post_type_enum.sql`: enum `public.post_type` con 7 valores, guarda de re-aplicación, `revoke` y `USAGE` a `service_role`.
- `supabase/migrations/<version>_create_posts.sql`: tabla `public.posts` con 11 columnas, constraints, 3 índices, trigger `updated_at`, RLS cerrado y grants a `service_role`.
- `supabase/migrations/<version>_create_post_children.sql`: tabla `public.post_children` con `daycare_id`, PK compuesta, FKs, índice y RLS cerrado.
- `supabase/migrations/<version>_create_post_photos.sql`: tabla `public.post_photos` con `storage_path`, dimensiones, posición, constraints, índices y RLS cerrado.
- `supabase/migrations/<version>_open_post_access.sql`: policies de lectura para staff y padres, policies de insert para staff en las tres tablas, grants y `USAGE` del enum.
- `supabase/migrations/<version>_fix_post_policy_recursion.sql`: helper `public.post_is_own(uuid, uuid)` y las dos policies de insert que lo usan, para cortar la recursión entre `posts` y `post_children`.
- `supabase/migrations/<version>_create_post_photos_bucket.sql`: bucket privado `post-photos` con límite de 5 MB y MIME permitidos, más las policies de `storage.objects` (lectura de staff, lectura de padres, subida propia y borrado propio).
- `supabase/migrations/<version>_create_post_rpc.sql`: función `public.create_post(...)` `security invoker` que valida y escribe las tres tablas en una transacción.
- `supabase/migrations/<version>_add_post_room_wide.sql`: columna `posts.room_wide`, firma nueva de `create_post(...)` con `p_room_wide` y policies de padres que usan ese flag.
- `supabase/migrations/<version>_add_daycare_overview_rpc.sql`: función `public.daycare_overview()` `security definer` con el nombre y el conteo de niños activos, porque `public.daycares` no tiene `SELECT` para `authenticated`.
- Aplicar las diez migraciones con el MCP `apply_migration` y versionarlas en `supabase/migrations/`.
- `utils/supabase/database.types.ts`: regenerado con `generate_typescript_types` después de las migraciones.
- `supabase/README.md`: sección **Publicaciones y fotos** con el modelo de acceso, el bucket y la RPC.
- `app/_data/post-types.ts`: `PostType` y `postTypes` (7 opciones con sus clases) movidos desde `post-composer.ts`, consumidos por el composer y por el badge del feed.
- `app/_data/post-composer.ts`: conserva `descriptionLimits`, `photoRules`, `wholeRoomLabel` y `audienceChipId`; `photoRules` suma `maxDimension`, `outputType`, `quality` y `signedUrlTtl`.
- `app/_lib/posts.ts`: dominio puro con `FeedPost`, `FeedPhoto`, `ComposerAudience`, `audienceLabel`, `splitFeedByDay`, `formatPostTime` y `formatFeedDate`, en `America/Lima`.
- `app/_lib/post-queries.ts`: DAL con `getDaycareOverview`, `getComposerAudience` y `getFeedPosts` (incluye URLs firmadas en batch).
- `app/(app)/posts/actions.ts`: Server Action `createPost` que valida, llama a la RPC y limpia los archivos si la RPC falla.
- `app/_components/feed/post-form.tsx`: selector SALA, chips reales filtrados por sala, bloqueo por `photo_consent`, re-encode a WebP, subida directa a Storage y estados de envío.
- `app/_components/feed/post-composer-provider.tsx`: recibe `audience` y `user`, calcula el foco inicial real y sigue remontando el formulario al cerrar.
- `app/_components/feed/post-type-badge.tsx`: pasa de 3 `PostKind` a los 7 `post_type`, con las etiquetas y colores del composer.
- `app/_components/feed/feed-post.tsx`: autor real, audiencia, 7 tipos, grilla de fotos, footer sin "Editar" y sin enlaces muertos.
- `app/_components/feed/post-photo-grid.tsx`: client component con la grilla y el lightbox sobre `ModalDialog`.
- `app/_components/feed/feed-composer.tsx`, `app/_components/app-shell.tsx`, `app/_components/app-sidebar.tsx`: los tres accesos a "Nueva publicación" se ocultan si el rol es `parent`.
- `app/_components/brand.tsx`: el subtítulo deja de leer `currentRoom` y recibe el nombre del daycare por prop.
- `app/_components/app-shell-skeleton.tsx`: `Brand` sin subtítulo en el fallback.
- `app/(app)/layout.tsx`: resuelve `getDaycareOverview` y `getComposerAudience`, y monta el provider solo para `admin`/`staff`.
- `app/(app)/page.tsx`: header real, secciones **PUBLICADO HOY** y **ANTERIORES**, estado vacío y feed desde la DAL.
- `app/_data/feed.ts` y `app/_data/feed-audience.ts`: se eliminan.
- Degradación: el modal conserva su comportamiento a 390×600; la grilla de fotos y el lightbox no generan scroll horizontal.

**Out of scope (para specs futuras):**

- Editar o borrar publicaciones. El enlace "Editar" del footer se oculta.
- Borradores, programación (`published_at` futuro), publicación diferida y "guardar para después".
- Notificaciones por email o push al publicar. `users.notify_on_post` y Resend no se tocan.
- Reacciones y comentarios funcionales. El footer sigue mostrando 0/0 sin acción.
- Feed y pantallas de padre, aunque las policies de lectura ya existan.
- Captura del consentimiento de fotos. `children.photo_consent` se respeta, no se edita.
- Reordenar fotos, álbumes, portada elegida, transformaciones de imagen y CDN.
- Moderación, reportes y borrado lógico de publicaciones.
- Videos, GIF, HEIC y cualquier formato que no sea JPG, PNG o WebP.
- Job de limpieza de archivos huérfanos.
- Tests automatizados, modo oscuro e i18n.

## Data model

### Enum `post_type`

```sql
-- supabase/migrations/<version>_create_post_type_enum.sql
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'post_type' and n.nspname = 'public'
  ) then
    create type public.post_type as enum (
      'meal', 'nap', 'activity', 'achievement', 'mood', 'photo', 'announcement'
    );
  end if;
end
$$;

revoke all on type public.post_type from public, anon, authenticated;
grant usage on type public.post_type to service_role;
```

Convenciones:

- Los 7 valores son los del composer de SPEC 06. `mood` es el único que no estaba en el diccionario y se agrega acá.
- Los labels visibles (`Comida`, `Siesta`, `Actividad`, `Logro`, `Ánimo`, `Foto`, `Anuncio`) viven en `app/_data/post-types.ts`.
- El orden es estable y termina en `announcement`; el diccionario agrega valores al final.

### Tabla `posts`

```sql
-- supabase/migrations/<version>_create_posts.sql
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  daycare_id   uuid not null,
  author_id    uuid not null,
  room_id      uuid,
  room_wide    boolean not null default false,
  type         public.post_type not null,
  title        text,
  body         text not null,
  published_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint posts_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint posts_author_fkey foreign key (author_id)
    references public.users (id) on delete restrict,
  constraint posts_room_fkey foreign key (room_id)
    references public.rooms (id) on delete restrict,
  constraint posts_body_length check (char_length(btrim(body)) between 10 and 600),
  constraint posts_title_length
    check (title is null or char_length(btrim(title)) between 1 and 120)
);

create index posts_daycare_published_idx
  on public.posts (daycare_id, published_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index posts_room_id_idx on public.posts (room_id);

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

alter table public.posts enable row level security;
revoke all on table public.posts from anon, authenticated;
grant all on table public.posts to service_role;
```

Convenciones:

- `daycare_id` no está en el diccionario. Sin él, la RLS de un post sin sala dependería de un join nullable.
- `title` se crea nullable para respetar el diccionario y **nunca se escribe**: el composer no lo pide.
- `body` 10–600, igual que `descriptionLimits` de SPEC 06.
- `published_at` default `now()`. No hay programación: la RPC no lo acepta.
- `room_id` nullable. Se llena cuando la audiencia es "toda la sala".
- `room_wide` distingue el snapshot de "Toda la sala" de un subconjunto de niños de la misma sala. Sin el flag, `room_id` obligatorio impedía publicar a un subconjunto en salas con más de un niño.
- FKs simples, no compuestas. PostgREST necesita resolver los embeds del feed (`author`, `room`, `post_children`, `post_photos`) y la FK compuesta los complica. La consistencia entre guarderías la imponen las policies y la RPC.
- `on delete restrict` en autor y sala: no hay baja de usuarios ni de salas. `posts` sí cascadea desde sus hijos, no desde el padre.

### Tabla `post_children`

```sql
-- supabase/migrations/<version>_create_post_children.sql
create table public.post_children (
  post_id    uuid not null,
  child_id   uuid not null,
  daycare_id uuid not null,

  constraint post_children_pkey primary key (post_id, child_id),
  constraint post_children_post_fkey foreign key (post_id)
    references public.posts (id) on delete cascade,
  constraint post_children_child_fkey foreign key (child_id)
    references public.children (id) on delete restrict,
  constraint post_children_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict
);

create index post_children_child_id_idx on public.post_children (child_id);
create index post_children_daycare_id_idx on public.post_children (daycare_id);

alter table public.post_children enable row level security;
revoke all on table public.post_children from anon, authenticated;
grant all on table public.post_children to service_role;
```

Convenciones:

- Es la tabla que filtra el feed del padre: `child_id` es el driver.
- El `unique (post_id, child_id)` implícito de la PK impide etiquetar dos veces al mismo niño.
- La consistencia `post.daycare_id = child.daycare_id = post_children.daycare_id` se valida en la RPC y en las policies de insert.
- `on delete cascade` desde el post: si el post se borra, sus vínculos se van. `child_id` es `restrict` porque no hay borrado de niños.

### Tabla `post_photos`

```sql
-- supabase/migrations/<version>_create_post_photos.sql
create table public.post_photos (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null,
  daycare_id   uuid not null,
  storage_path text not null,
  width        int,
  height       int,
  position     smallint not null,
  created_at   timestamptz not null default now(),

  constraint post_photos_post_fkey foreign key (post_id)
    references public.posts (id) on delete cascade,
  constraint post_photos_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint post_photos_storage_path_key unique (storage_path),
  constraint post_photos_position_key unique (post_id, position),
  constraint post_photos_storage_path_format
    check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'),
  constraint post_photos_position check (position between 0 and 3),
  constraint post_photos_dimensions
    check ((width is null and height is null) or (width > 0 and height > 0))
);

create index post_photos_post_id_idx on public.post_photos (post_id);
create index post_photos_daycare_id_idx on public.post_photos (daycare_id);

alter table public.post_photos enable row level security;
revoke all on table public.post_photos from anon, authenticated;
grant all on table public.post_photos to service_role;
```

Convenciones:

- `storage_path` es la ruta relativa dentro del bucket, **no** una URL: `{daycare_id}/{author_id}/{file_id}.{ext}`.
- El check de formato obliga a tres segmentos UUID; no admite `..`, nombres libres ni rutas de otro bucket.
- `position` va de 0 a 3 y es único por post. La RPC la asigna en el orden del array.
- `width`/`height` los calcula el canvas después del re-encode, así el lightbox no salta.
- Máximo 4 por post: lo impide la RPC y el `check` de `position`.

### Policies y grants

```sql
-- supabase/migrations/<version>_open_post_access.sql
drop policy if exists posts_select_staff on public.posts;
drop policy if exists posts_select_parent on public.posts;
drop policy if exists posts_insert_staff on public.posts;

create policy posts_select_staff
on public.posts for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy posts_select_parent
on public.posts for select to authenticated
using (
  exists (
    select 1
    from public.post_children pc
    join public.parent_children px on px.child_id = pc.child_id
    where pc.post_id = posts.id
      and px.parent_id = (select auth.uid())
  )
  or (
    posts.room_wide
    and posts.room_id is not null
    and exists (
      select 1
      from public.children c
      join public.parent_children px on px.child_id = c.id
      where c.room_id = posts.room_id
        and c.daycare_id = posts.daycare_id
        and px.parent_id = (select auth.uid())
    )
  )
);

create policy posts_insert_staff
on public.posts for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and author_id = (select auth.uid())
  and (
    room_id is null
    or exists (
      select 1 from public.rooms r
      where r.id = posts.room_id and r.daycare_id = posts.daycare_id
    )
  )
);

drop policy if exists post_children_select_staff on public.post_children;
drop policy if exists post_children_select_parent on public.post_children;
drop policy if exists post_children_insert_staff on public.post_children;

create policy post_children_select_staff
on public.post_children for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy post_children_select_parent
on public.post_children for select to authenticated
using (
  exists (
    select 1 from public.parent_children px
    where px.child_id = post_children.child_id
      and px.parent_id = (select auth.uid())
  )
);

create policy post_children_insert_staff
on public.post_children for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and exists (
    select 1 from public.posts p
    where p.id = post_children.post_id
      and p.daycare_id = post_children.daycare_id
      and p.author_id = (select auth.uid())
  )
  and exists (
    select 1 from public.children c
    where c.id = post_children.child_id
      and c.daycare_id = post_children.daycare_id
      and c.status = 'active'
  )
);

drop policy if exists post_photos_select_staff on public.post_photos;
drop policy if exists post_photos_select_parent on public.post_photos;
drop policy if exists post_photos_insert_staff on public.post_photos;

create policy post_photos_select_staff
on public.post_photos for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy post_photos_select_parent
on public.post_photos for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
  )
);

create policy post_photos_insert_staff
on public.post_photos for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and p.daycare_id = post_photos.daycare_id
      and p.author_id = (select auth.uid())
  )
  and split_part(post_photos.storage_path, '/', 1) = post_photos.daycare_id::text
  and split_part(post_photos.storage_path, '/', 2) = (select auth.uid())::text
);

grant select, insert on table public.posts to authenticated;
grant select, insert on table public.post_children to authenticated;
grant select, insert on table public.post_photos to authenticated;
grant usage on type public.post_type to authenticated;
```

Convenciones:

- **Solo los posts `room_wide` alcanzan a toda la sala.** `room_id` se guarda en todos los posts porque SALA es obligatoria; el flag distingue el snapshot completo de un subconjunto. Sin él, cualquier post de la sala sería visible para todos sus padres.
- `post_photos_select_parent` delega en la RLS de `posts`: si el post no es visible, el `exists` no encuentra fila. No se duplica la regla.
- `current_staff_daycare_id()` (SPEC 11) devuelve `null` para padres, así que las policies de staff quedan cerradas sin un `role in (...)` extra.
- No hay policy de `update` ni de `delete` en las tres tablas. No hay UI de edición.
- `anon` sigue sin grants. `service_role` conserva acceso completo.
- El insert directo desde la app queda permitido solo para el autor y su guardería, aunque el camino normal es la RPC.

### Fix de recursión en las policies de insert

La primera versión de `post_children_insert_staff` consultaba `posts` con un `exists`. Postgres detecta recursión infinita en la policy de `post_children`, porque `posts_select_parent` vuelve a consultar `post_children`. La migración `<version>_fix_post_policy_recursion.sql` agrega un helper `security definer` y reemplaza las dos policies de insert:

```sql
-- supabase/migrations/<version>_fix_post_policy_recursion.sql
create or replace function public.post_is_own(p_post_id uuid, p_daycare_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and p.daycare_id = p_daycare_id
      and p.author_id = (select auth.uid())
  );
$$;

revoke all on function public.post_is_own(uuid, uuid) from public, anon;
grant execute on function public.post_is_own(uuid, uuid) to authenticated;

drop policy if exists post_children_insert_staff on public.post_children;

create policy post_children_insert_staff
on public.post_children for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and public.post_is_own(post_children.post_id, post_children.daycare_id)
  and exists (
    select 1 from public.children c
    where c.id = post_children.child_id
      and c.daycare_id = post_children.daycare_id
      and c.status = 'active'
  )
);

drop policy if exists post_photos_insert_staff on public.post_photos;

create policy post_photos_insert_staff
on public.post_photos for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and public.post_is_own(post_photos.post_id, post_photos.daycare_id)
  and split_part(post_photos.storage_path, '/', 1) = post_photos.daycare_id::text
  and split_part(post_photos.storage_path, '/', 2) = (select auth.uid())::text
);
```

Convenciones:

- `post_is_own` solo devuelve `true` cuando el post es del usuario que llama, así que no filtra ids ajenos.
- Al ser `security definer` evita que la policy de insert vuelva a evaluar la RLS de `posts`.
- No se agrega a la app: es un detalle de las policies.

### Bucket y policies de Storage

```sql
-- supabase/migrations/<version>_create_post_photos_bucket.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists post_photos_objects_select_staff on storage.objects;
drop policy if exists post_photos_objects_select_parent on storage.objects;
drop policy if exists post_photos_objects_insert_staff on storage.objects;
drop policy if exists post_photos_objects_delete_own on storage.objects;

create policy post_photos_objects_select_staff
on storage.objects for select to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = (select public.current_staff_daycare_id())::text
);

create policy post_photos_objects_select_parent
on storage.objects for select to authenticated
using (
  bucket_id = 'post-photos'
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = storage.objects.name
      and (
        exists (
          select 1
          from public.post_children pc
          join public.parent_children px on px.child_id = pc.child_id
          where pc.post_id = p.id
            and px.parent_id = (select auth.uid())
        )
        or (
          p.room_wide
          and p.room_id is not null
          and exists (
            select 1
            from public.children c
            join public.parent_children px on px.child_id = c.id
            where c.room_id = p.room_id
              and c.daycare_id = p.daycare_id
              and px.parent_id = (select auth.uid())
          )
        )
      )
  )
);

create policy post_photos_objects_insert_staff
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = (select public.current_staff_daycare_id())::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy post_photos_objects_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
```

Convenciones:

- Bucket **privado**: la única lectura es una URL firmada o el header `Authorization`. No hay URL pública.
- La ruta `{daycare_id}/{author_id}/{file_id}.{ext}` permite que las policies sean por prefijo, sin joins costosos en el camino de escritura.
- El límite de 5 MB y los MIME viven en el bucket además del cliente. Un archivo que saltee la UI igual es rechazado por Storage.
- `delete` propio existe solo para limpiar subidas fallidas. No hay UI de borrar fotos de un post publicado.
- Las policies de Storage no deben consultar `storage.objects` dentro de sí mismas: recursión.

### RPC `create_post`

```sql
-- supabase/migrations/<version>_create_post_rpc.sql
create or replace function public.create_post(
  p_type      public.post_type,
  p_room_id   uuid,
  p_body      text,
  p_child_ids uuid[],
  p_photos    jsonb,
  p_room_wide boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id    uuid := (select auth.uid());
  v_daycare_id uuid := (select public.current_staff_daycare_id());
  v_body       text := btrim(coalesce(p_body, ''));
  v_children   uuid[] := coalesce(p_child_ids, array[]::uuid[]);
  v_photos     jsonb := coalesce(p_photos, '[]'::jsonb);
  v_room_count int;
  v_post_id    uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_daycare_id is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if char_length(v_body) < 10 or char_length(v_body) > 600 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  if jsonb_array_length(v_photos) > 4 then
    raise exception 'too_many_photos' using errcode = '22023';
  end if;

  if p_room_id is null and p_room_wide then
    raise exception 'invalid_room' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct child_id), array[]::uuid[])
  into v_children
  from unnest(v_children) as t(child_id);

  if p_room_id is not null and not exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.daycare_id = v_daycare_id
  ) then
    raise exception 'invalid_room' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_children) as t(child_id)
    where not exists (
      select 1 from public.children c
      where c.id = t.child_id
        and c.daycare_id = v_daycare_id
        and c.status = 'active'
        and (p_room_id is null or c.room_id = p_room_id)
    )
  ) then
    raise exception 'invalid_children' using errcode = '22023';
  end if;

  if p_room_wide and p_room_id is not null then
    select count(*) into v_room_count
    from public.children c
    where c.room_id = p_room_id
      and c.daycare_id = v_daycare_id
      and c.status = 'active';

    if v_room_count <> coalesce(array_length(v_children, 1), 0) then
      raise exception 'room_audience_mismatch' using errcode = '22023';
    end if;
  end if;

  if jsonb_array_length(v_photos) > 0 and exists (
    select 1 from public.children c
    where c.id = any(v_children) and not c.photo_consent
  ) then
    raise exception 'photo_consent_required' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_photos) as t(photo)
    where coalesce(t.photo ->> 'path', '') not like
      v_daycare_id::text || '/' || v_user_id::text || '/%'
  ) then
    raise exception 'invalid_photo_path' using errcode = '22023';
  end if;

  insert into public.posts (daycare_id, author_id, room_id, room_wide, type, body)
  values (v_daycare_id, v_user_id, p_room_id, p_room_wide, p_type, v_body)
  returning id into v_post_id;

  insert into public.post_children (post_id, child_id, daycare_id)
  select v_post_id, t.child_id, v_daycare_id
  from unnest(v_children) as t(child_id)
  on conflict do nothing;

  insert into public.post_photos (post_id, daycare_id, storage_path, width, height, position)
  select
    v_post_id,
    v_daycare_id,
    t.photo ->> 'path',
    nullif(t.photo ->> 'width', '')::int,
    nullif(t.photo ->> 'height', '')::int,
    (t.ord - 1)::smallint
  from jsonb_array_elements(v_photos) with ordinality as t(photo, ord);

  return v_post_id;
end;
$$;

revoke all on function public.create_post(public.post_type, uuid, text, uuid[], jsonb, boolean)
  from public, anon;
grant execute on function public.create_post(public.post_type, uuid, text, uuid[], jsonb, boolean)
  to authenticated;
```

Convenciones:

- `security invoker`: la RPC corre con la sesión del usuario y las policies se aplican. No se necesita `service_role` en la app.
- Todo en una transacción: si falla la audiencia o una foto, no queda el post a medias.
- El autor y el daycare **no se reciben por parámetro**: salen de `auth.uid()` y de `current_staff_daycare_id()`.
- "Toda la sala" se valida como snapshot exacto solo con `p_room_wide = true`: si la sala tiene 3 niños y llegan 2 ids, la RPC falla con `room_audience_mismatch`. Un subconjunto de la sala se publica con `p_room_wide = false` y llega solo a esos niños.
- Las fotos se validan por prefijo de ruta. El archivo ya está subido; la RPC solo registra metadatos.
- Los mensajes de error son códigos estables (`invalid_body`, `photo_consent_required`, …) que la action traduce a español.
- `create or replace` la hace re-aplicable.

### Contratos de la app

```ts
// app/_data/post-types.ts
export type PostType =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type PostTypeOption = {
  id: PostType;
  label: string;
  idleClassName: string;
  activeClassName: string;
};

export const postTypes: readonly PostTypeOption[];
```

```ts
// app/_lib/posts.ts — dominio puro, sin Supabase ni next/headers
export type FeedPhoto = {
  path: string;
  url: string; // URL firmada, 1 h
  width: number | null;
  height: number | null;
};

export type FeedPost = {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  authorInitial: string;
  publishedAt: string; // ISO
  timeLabel: string; // "14:20"
  audienceLabel: string; // "familia de Harly" | "toda la sala Soles"
  body: string;
  photos: FeedPhoto[];
  isOwn: boolean;
};

export type ComposerChild = {
  id: string;
  firstName: string;
  initial: string;
  tone: ChildTone;
  roomId: string | null;
  photoConsent: boolean;
};

export type ComposerAudience = {
  rooms: { id: string; name: string; position: number }[];
  children: ComposerChild[];
};

export const FEED_PAGE_SIZE = 20;
export const APP_TIME_ZONE = "America/Lima";

export function audienceLabel(
  childFirstNames: string[],
  roomName: string | null,
): string;
export function splitFeedByDay(
  posts: FeedPost[],
  now?: Date,
): { today: FeedPost[]; previous: FeedPost[] };
export function formatPostTime(iso: string): string;
export function formatFeedDate(now?: Date): string; // "martes 27 oct"
```

```ts
// app/_lib/post-queries.ts — server only por uso
export function getDaycareOverview(): Promise<{
  name: string;
  childrenCount: number;
}>;
export function getComposerAudience(daycareId: string): Promise<ComposerAudience>;
export function getFeedPosts(
  daycareId: string,
  currentUserId: string,
): Promise<FeedPost[]>;
```

```ts
// app/(app)/posts/actions.ts
export type CreatePostPhotoInput = { path: string; width: number; height: number };
export type CreatePostInput = {
  type: PostType;
  roomId: string;
  roomWide: boolean;
  body: string;
  childIds: string[];
  photos: CreatePostPhotoInput[];
};
export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export function createPost(input: CreatePostInput): Promise<CreatePostResult>;
```

```ts
// app/_components/feed/post-composer-provider.tsx
type PostComposerProviderProps = {
  children: ReactNode;
  audience: ComposerAudience;
  user: { id: string; daycareId: string };
};
```

```ts
// app/_components/feed/post-form.tsx
type PostFormProps = {
  audience: ComposerAudience;
  user: { id: string; daycareId: string };
  onClose: () => void;
};
```

Convenciones:

- `PostType` es un union literal, no el enum generado. Así el dominio se puede importar desde cliente y el día que cambie el enum, TypeScript lo detecta.
- `FeedPost` es de presentación: ya trae la etiqueta de audiencia y la hora formateada. La página no calcula copy.
- `audienceLabel`: 0 nombres → `sin destinatarios`; 1 → `familia de {nombre}`; 2–3 → `familia de A, B y C`; 4+ → `{n} familias`; con sala → `toda la sala {sala}`.
- `splitFeedByDay` compara días en `America/Lima`, no en UTC.
- `audienceLabel` usa la sala solo cuando `room_wide = true`; un subconjunto muestra los nombres o el conteo de familias.
- `getFeedPosts` pide 20 posts, ordena por `published_at desc` y firma todas las fotos en **una** llamada a `createSignedUrls`.
- `getDaycareOverview` y `getComposerAudience` usan `cache()` de React para deduplicar el render del layout y la página.
- `getDaycareOverview` llama a `daycare_overview()` y no consulta `daycares` directo: la tabla no tiene `SELECT` para `authenticated`.

### Consultas

```ts
// getFeedPosts — forma del select
const { data } = await supabase
  .from("posts")
  .select(`
    id, type, body, published_at, author_id, room_wide,
    author:users!posts_author_fkey(full_name),
    room:rooms!posts_room_fkey(name),
    post_children(children(full_name)),
    post_photos(storage_path, width, height, position)
  `)
  .eq("daycare_id", daycareId)
  .order("published_at", { ascending: false })
  .limit(FEED_PAGE_SIZE);
```

- Las fotos se firman con `supabase.storage.from("post-photos").createSignedUrls(paths, 3600)`.
- Si una firma falla, esa foto se omite y el post se muestra sin ella. No se rompe el feed.
- `post_photos` se ordena por `position` en JS: PostgREST no garantiza el orden del embed.
- `getComposerAudience` pide solo `children (id, full_name, room_id, photo_consent)` y `rooms (id, name, position)`; no reutiliza `getChildren` porque ese trae padres y alergias de más.

### Copy y estados

| Situación | Texto |
| --- | --- |
| Eyebrow del feed | `GUARDERÍA · {NOMBRE DEL DAYCARE}` en mayúsculas |
| Resumen del feed | `{n} niños · {martes 27 oct}` |
| Sección de hoy | `PUBLICADO HOY` |
| Sección anterior | `ANTERIORES` |
| Feed vacío | `Todavía no hay publicaciones.` + `Compartí el primer momento del día.` |
| Autor propio | `14:20 · publicado por vos` |
| Autor ajeno | `14:20` |
| Anuncio | Avatar megáfono, autor `Anuncio general` en la tarjeta |
| Sala sin niños | `Esta sala no tiene niños.` |
| Consentimiento | `{Nombre} no tiene consentimiento de fotos. Sacá las fotos o cambialo de destinatarios.` |
| Subida pendiente | `Subiendo {n} de {total}…` |
| Publicación pendiente | `Publicando…` |
| Error de cuerpo | `La descripción debe tener entre 10 y 600 caracteres.` |
| Error de sala | `Elegí una sala válida.` |
| Error de destinatarios | `Alguno de los destinatarios ya no está disponible.` |
| Error de sala cambiada | `La sala cambió mientras escribías. Volvé a elegir los destinatarios.` |
| Error de consentimiento | `Hay niños sin consentimiento de fotos. Sacá las fotos o cambialos de destinatarios.` |
| Error de fotos | `No pudimos subir las fotos. Intentá de nuevo.` |
| Error de permiso | `No tenés permiso para publicar.` |
| Error genérico | `No pudimos publicar. Intentá de nuevo.` |

## Convenciones de código

Se mantienen las de SPEC 01–11: identificadores en inglés, copy en español, named exports, sin `any`, sin `style={{}}`, sin hex en el JSX y sin configs de ruta (`dynamic`, `revalidate`, `fetchCache`, `runtime`, `dynamicParams`).

Específicas de esta spec:

- **Dos módulos de publicaciones**: `app/_lib/posts.ts` (puro, importable desde cliente) y `app/_lib/post-queries.ts` (Supabase + `next/headers`). Nunca al revés.
- **Server Action en `app/(app)/posts/actions.ts`** con `"use server"`. El único client component nuevo es `post-photo-grid.tsx`; el resto ya lo era.
- **El navegador sube, la action registra**: `createClient()` de `utils/supabase/client.ts` sube los blobs a Storage; la action recibe paths y llama a la RPC. No se usa `service_role` ni se sube `serverActions.bodySizeLimit`.
- **Re-encode antes de subir**: `createImageBitmap` → canvas → `toBlob("image/webp", 0.85)` con lado mayor ≤2048 px. Si `toBlob` devuelve `null` (Safari viejo), se usa `image/jpeg` y la extensión de la ruta cambia a `jpg`.
- **Metadatos fuera**: el canvas descarta EXIF, GPS y nombre original. Es el motivo principal del re-encode, no el peso.
- **Un `<dialog>` sigue siendo uno**: el lightbox reutiliza `ModalDialog`, con `titleId` propio y foco atrapado.
- **`<img>` nativo + `createSignedUrls`**: `next/image` no puede cachear una URL firmada que cambia en cada render. Se agrega el `eslint-disable-next-line @next/next/no-img-element` justificado, como en SPEC 06.
- **Sin estado global**: el composer sigue con estado local; el provider solo guarda la `key` de sesión.
- **El formulario no sube al elegir**: las previews siguen siendo `blob:` y el archivo original nunca sale del navegador. La subida ocurre al enviar.
- **Errores de la action**: `{ ok: false, error }` con los textos de la tabla. Nunca se devuelve el error crudo de Postgres.
- **Limpieza de archivos**: si la RPC falla, la action borra los paths con el cliente de la sesión. Si falla una subida, el formulario borra los ya subidos antes de mostrar el error.
- **La RLS no se duplica en la app**: las consultas filtran por `daycare_id` para dejar la intención, pero la verdad está en las policies.
- **Roles**: `canPublish = user.role !== "parent"`. Ni el CTA ni el `<dialog>` se montan para un padre.

## Implementation plan

1. **Enum.** Aplicar `create_post_type_enum` con `apply_migration`, anotar el `version` y crear el archivo. Test: `enum_range(null::public.post_type)` devuelve los 7 valores y `has_type_privilege('anon', …)` es `false`.
2. **Posts.** Aplicar `create_posts`, crear el archivo. Test: `list_tables` muestra 11 columnas, PK `id`, trigger `posts_set_updated_at`, `rls_enabled: true` y 0 filas.
3. **Audiencia y fotos.** Aplicar `create_post_children` y `create_post_photos`, crear los archivos. Test: PK compuesta en `post_children`, unique `post_photos_storage_path_key`, `position` 0–3 y 0 filas en ambas.
4. **Acceso y recursión.** Aplicar `open_post_access` y `fix_post_policy_recursion`, crear los archivos. Test: 3 policies de staff + 3 de padres + 3 de insert; `anon` sin grants; `authenticated` con `SELECT, INSERT` y sin `UPDATE`/`DELETE`; un insert de prueba en `post_children` no falla con recursión.
5. **Bucket.** Aplicar `create_post_photos_bucket`, crear el archivo. Test: `storage.buckets` tiene `post-photos` con `public = false`, `file_size_limit = 5242880` y los 3 MIME; 4 policies en `storage.objects`.
6. **RPC.** Aplicar `create_post_rpc`, crear el archivo. Test con `execute_sql` impersonando al staff: un insert válido devuelve un uuid y crea 1 post + N vínculos + M fotos; con `photo_consent = false` y fotos falla con `photo_consent_required`; con 5 fotos falla con `too_many_photos`. Rollback al terminar.
7. **Tipos.** Correr `generate_typescript_types`, reemplazar `utils/supabase/database.types.ts`. Test: `npx tsc --noEmit` limpio e incluye `posts`, `post_children`, `post_photos` y `post_type`.
8. **Datos y dominio.** Crear `app/_data/post-types.ts`, mover `postTypes`/`PostType` y extender `photoRules`; crear `app/_lib/posts.ts`. Test: `npx tsc --noEmit` limpio y el composer sigue compilando.
9. **DAL.** Crear `app/_lib/post-queries.ts` con las tres consultas y el batch de firmas. Test: una página temporal que imprima `getFeedPosts` devuelve 0 posts sin error.
10. **Badge.** Reescribir `post-type-badge.tsx` con los 7 tipos y las etiquetas del composer. Test: renderiza los 7 badges con sus colores.
11. **Tarjeta y fotos.** Reescribir `feed-post.tsx` y crear `post-photo-grid.tsx`. Test: un post con 1 foto se ve a 260px, con 4 en grilla, y el clic abre el lightbox con Escape.
12. **Feed real.** Reescribir `app/(app)/page.tsx` con header real, secciones y estado vacío. Test: con 0 posts se ve el estado vacío y el resumen con el conteo real.
13. **Provider y roles.** Extender `PostComposerProvider`, `(app)/layout.tsx`, `app-shell.tsx`, `app-sidebar.tsx` y `brand.tsx`; ocultar los tres CTAs para `parent`. Test: la sidebar muestra el nombre real del daycare leído por `daycare_overview()` y un padre no ve el CTA.
14. **Composer.** Agregar SALA, chips reales, consentimiento, re-encode, subida y `createPost` con `useTransition`. Test manual: publicar sin foto y con 2 fotos; ambas aparecen en el feed sin recargar.
15. **Limpieza y documentación.** Borrar `app/_data/feed.ts` y `app/_data/feed-audience.ts`, actualizar `supabase/README.md` y verificar que no quedan imports. Test: `grep -r "_data/feed" app/` no devuelve nada y `npm run build` compila.

## Acceptance criteria

- [x] `list_migrations` incluye `create_post_type_enum`, `create_posts`, `create_post_children`, `create_post_photos`, `open_post_access`, `fix_post_policy_recursion`, `create_post_photos_bucket`, `create_post_rpc`, `add_daycare_overview_rpc` y `add_post_room_wide`, y los diez archivos de `supabase/migrations/` tienen el mismo `version`.
- [x] `enum_range(null::public.post_type)` devuelve exactamente `{meal,nap,activity,achievement,mood,photo,announcement}`.
- [x] `has_type_privilege('authenticated', 'public.post_type', 'usage')` es `true` y para `anon` es `false`.
- [x] `list_tables` muestra `posts` con 11 columnas, `post_children` con 3 y `post_photos` con 8, las tres con `rls_enabled: true`.
- [x] Existen `posts_body_length`, `posts_title_length`, `post_photos_storage_path_format`, `post_photos_position` y `post_photos_dimensions`.
- [x] Existe el trigger `posts_set_updated_at` apuntando a `public.set_updated_at()`.
- [x] Existen las policies `posts_select_staff`, `posts_select_parent`, `posts_insert_staff`, `post_children_select_staff`, `post_children_select_parent`, `post_children_insert_staff`, `post_photos_select_staff`, `post_photos_select_parent` y `post_photos_insert_staff`.
- [x] No existe ninguna policy de `DELETE` ni de `UPDATE` en `posts`, `post_children` ni `post_photos`.
- [x] `information_schema.role_table_grants` no devuelve filas de `anon` para las tres tablas; `authenticated` tiene `SELECT, INSERT` y no `DELETE`.
- [x] `storage.buckets` tiene `post-photos` con `public = false`, `file_size_limit = 5242880` y `allowed_mime_types = {image/jpeg,image/png,image/webp}`.
- [x] Existen las 4 policies de `storage.objects` y ninguna permite `UPDATE`.
- [x] `public.create_post` existe, es `security invoker` y `authenticated` tiene `EXECUTE`; `anon` no.
- [x] `public.post_is_own` existe, es `security definer`, `authenticated` tiene `EXECUTE` y `anon` no.
- [x] `public.daycare_overview` existe, es `security definer` y devuelve el nombre y el conteo de niños activos del daycare del usuario; `authenticated` tiene `EXECUTE` y `anon` no.
- [x] Un `create_post` válido no falla con `infinite recursion detected in policy for relation "post_children"`.
- [x] Un `create_post` válido sin fotos crea 1 fila en `posts` con `daycare_id`, `author_id = auth.uid()`, `room_id`, `room_wide`, `type` y `body`, y los vínculos en `post_children`.
- [x] Un `create_post` con 2 fotos crea 2 filas en `post_photos` con `position` 0 y 1, y los mismos `width`/`height` del canvas.
- [x] `create_post` con 5 fotos falla con `too_many_photos` y no deja ningún post.
- [x] `create_post` con `body` de 9 caracteres falla con `invalid_body`.
- [x] `create_post` con un `child_id` de otra guardería falla con `invalid_children`.
- [x] `create_post` con `p_room_wide = true` y un subconjunto de los niños de la sala falla con `room_audience_mismatch`.
- [x] `create_post` con `p_room_wide = false` y un subconjunto de una sala con 2 niños crea solo esos vínculos, guarda `room_wide = false` y la tarjeta muestra `familia de {nombre}`.
- [x] `create_post` con `p_room_wide = true` y todos los niños de la sala guarda `room_wide = true` y la tarjeta muestra `toda la sala {sala}`.
- [x] `create_post` con fotos y un niño con `photo_consent = false` falla con `photo_consent_required`; sin fotos, el mismo post se crea.
- [x] `create_post` con un path fuera del prefijo `{daycare_id}/{author_id}/` falla con `invalid_photo_path`.
- [x] Un padre vinculado a Harly ve el post que etiqueta a Harly y **no** ve el que etiqueta solo a otro niño.
- [x] Un padre de Soles ve un post con `room_wide = true` y `room_id` de Soles y **no** ve un post con `room_wide = false` de Soles que no etiqueta a su hijo.
- [x] `npm run build` termina sin errores.
- [x] `npx tsc --noEmit` termina sin errores.
- [x] `npx eslint app` termina sin errores.
- [x] La consola no muestra errores ni warnings de React en `/` con el feed real y con el modal abierto y cerrado.
- [x] `app/` no importa nada de `references/`.
- [x] `grep -r "_data/feed" app/` no devuelve coincidencias; `app/_data/feed.ts` y `app/_data/feed-audience.ts` no existen.
- [x] La sidebar muestra `Sala Soles` como subtítulo del logo, leído de `public.daycares`.
- [x] El header del feed muestra `GUARDERÍA · SALA SOLES`, `Buenas, Kevin` y un resumen con el conteo real de niños activos y la fecha de hoy en `America/Lima`.
- [x] Con 0 posts, el feed muestra `Todavía no hay publicaciones.` y no hay sección `ANTERIORES`.
- [x] Al abrir el modal, SALA tiene las 3 salas, la seleccionada por defecto es la primera con niños y PARA muestra solo los niños de esa sala.
- [x] Cambiar de sala limpia los chips y "Toda la sala"; TIPO, descripción y fotos se conservan.
- [x] Elegir "Toda la sala" marca un solo chip, envía todos los niños de la sala y el post guarda `room_id` + N filas en `post_children`.
- [x] Elegir una sala sin niños deshabilita "Toda la sala" y muestra `Esta sala no tiene niños.`.
- [x] Publicar sin fotos cierra el modal, agrega la tarjeta al feed de `PUBLICADO HOY` sin recargar y no crea objetos en Storage.
- [x] Publicar con 2 fotos sube exactamente 2 objetos a `post-photos/{daycare_id}/{user_id}/`, crea 2 filas en `post_photos` y la tarjeta muestra la grilla con las 2 imágenes firmadas.
- [x] Al elegir archivos no hay ninguna petición a Storage: las previews son `blob:` hasta el submit.
- [x] Un `.pdf` es rechazado con el mensaje de formato; un archivo de más de 5 MB es rechazado con el mensaje de peso.
- [x] El objeto subido es `image/webp` (o `image/jpeg` en el fallback), su lado mayor es ≤2048 px y su tamaño es menor que el original.
- [x] Con `photo_consent = false` en un niño etiquetado, agregar una foto muestra el mensaje con su nombre y "Publicar" no envía nada.
- [x] Si la RPC falla después de subir, el objeto se borra del bucket y el modal queda abierto con el mensaje.
- [x] Mientras se sube o se publica, el botón muestra `Subiendo…`/`Publicando…`, queda deshabilitado y el modal no se cierra con Escape.
- [x] El footer de cada post no muestra "Editar" y no queda ningún enlace muerto.
- [x] Un post con `published_at` de ayer aparece en `ANTERIORES` y uno de hoy en `PUBLICADO HOY`, con el corte en `America/Lima`.
- [x] Un usuario `parent` no ve el CTA de la sidebar, ni el del header móvil, ni el composer; `create_post` le responde `not_authorized`.
- [x] A 390×600 el feed, la grilla de 4 fotos y el lightbox se ven completos y `documentElement.scrollWidth` no supera `innerWidth`.
- [x] Las capturas `.playwright-mcp/spec-12-feed-1440.png`, `spec-12-feed-390.png`, `spec-12-composer-1440.png` y `spec-12-lightbox.png` muestran la jerarquía, colores y tipografía del mockup.
- [x] No hay `any`, `@ts-ignore`, `style={{}}` ni hex sueltos en el JSX de `app/`; `package.json` y `package-lock.json` no cambian.
- [x] Al cerrar la verificación, `public.posts`, `public.post_children` y `public.post_photos` vuelven a 0 filas y el bucket queda sin objetos de prueba.

## Decisions

- **Sí:** una sola spec para publicar y para el feed. Sin feed real, la feature no se puede verificar como producto.
- **Sí:** bucket privado `post-photos` y URLs firmadas. Una URL filtrada no expone fotos de niños; el costo es firmar por render.
- **Sí:** subida directa del navegador a Storage. La action recibe paths y evita el límite de 1 MB de las Server Actions.
- **Sí:** re-encode a WebP con canvas. Quita EXIF/GPS, reduce peso y entrega `width`/`height` reales. Es una decisión de privacidad, no de rendimiento.
- **Sí:** una RPC `security invoker` y transaccional. Tres inserts sueltos dejan posts sin audiencia o sin fotos.
- **Sí:** helper `post_is_own` `security definer` en las policies de insert de `post_children` y `post_photos`. Consultar `posts` desde esas policies entra en recursión porque `posts_select_parent` consulta `post_children`.
- **Sí:** el autor y el daycare salen de la sesión, no del cliente. El navegador no elige quién firma.
- **Sí:** `posts.daycare_id`. Sin esa columna, la RLS de un anuncio sin sala depende de un join nullable.
- **Sí:** FKs simples y consistencia de tenant en policies + RPC. PostgREST necesita resolver los embeds del feed y las FKs compuestas los complican.
- **Sí:** SALA obligatoria en el composer y chips filtrados. La sala es del niño; el staff elige el grupo, no una sala propia.
- **Sí:** "Toda la sala" guarda `room_id`, `room_wide = true` **y** `post_children`, y exige el snapshot exacto de la sala. Un subconjunto guarda `room_wide = false` y llega solo a los seleccionados.
- **Sí:** solo los posts `room_wide` alcanzan a toda la sala. `room_id` está en todos los posts porque SALA es obligatoria; sin el flag, un post a dos niños sería visible para todos los padres de la sala.
- **Sí:** 7 tipos con `mood`. Ya está en la UI de SPEC 06 y el usuario lo ve.
- **Sí:** policies de padres ahora y UI de padre después. Crear las tablas abiertas y cerrarlas más tarde cuesta más que dejar la regla escrita.
- **Sí:** solo publicar. Editar y borrar multiplican el alcance y el enlace "Editar" se oculta para no dejar un dead link.
- **Sí:** `photo_consent = false` bloquea el submit con fotos, en cliente y en servidor. Es el único dato de consentimiento que existe.
- **Sí:** 1–4 fotos, 5 MB y JPG/PNG/WebP en cualquier tipo. Se respeta la decisión de SPEC 06 de no tener reglas cruzadas.
- **Sí:** grilla + lightbox. Una foto suelta a 300 px no se puede apreciar; `ModalDialog` ya resuelve el foco y el Escape.
- **Sí:** feed **PUBLICADO HOY** + **ANTERIORES** con 20 posts. Conserva el diseño y no obliga a paginar la primera versión.
- **Sí:** `America/Lima` para el corte y la hora. El resto del producto usa `es-PE`.
- **Sí:** autor real y "Anuncio general" solo para `announcement`. El avatar del niño no representa a un post con varios destinatarios.
- **Sí:** "Para" con nombres hasta 3 y conteo después. Ocho nombres ocupan tres líneas y no aportan.
- **Sí:** publican `admin` y `staff`. El rol `parent` no ve el CTA y la RPC lo rechaza.
- **Sí:** sin seeds y con mocks eliminados. El feed arranca vacío y la verificación crea y limpia sus propios datos.
- **Sí:** `daycare_overview()` `security definer` para el nombre y el conteo. `public.daycares` no tiene `SELECT` para `authenticated`; abrirla para leer una fila expondría la tabla entera.
- **Sí:** el nombre del daycare llega a `Brand` por prop. `currentRoom` era un mock que mentiría al borrar `_data/feed.ts`.
- **Sí:** `getComposerAudience` liviana en el layout, solo para staff/admin. Evita un estado de carga al abrir el modal y no consulta padres ni alergias.
- **No:** `next/image` para las fotos. La URL firmada cambia en cada render y el optimizador no puede cachearla.
- **No:** `service_role` en la app. La subida y la RPC corren con la sesión del usuario y RLS.
- **No:** subir el archivo original. El nombre, el EXIF y el GPS no salen del navegador.
- **No:** notificaciones al publicar. `notify_on_post` y Resend van en su propia spec.
- **No:** reacciones, comentarios, edición, borrado, borradores, programación ni moderación.
- **No:** seeds de posts o niños. Sembrar niños que no existen es peor que un feed vacío.
- **No:** `title`. La columna existe por el diccionario, pero el composer no lo pide y siempre queda `null`.

## Risks

| Risk | Mitigation |
| --- | --- |
| Si se cierra la pestaña entre la subida y la RPC, quedan objetos huérfanos | La action borra los paths cuando la RPC falla y el formulario borra los parciales cuando una subida falla. El cierre de pestaña se documenta; un job de limpieza va en otra spec. |
| 20 posts × 4 fotos = 80 firmas por render | `createSignedUrls` firma en una sola llamada y el feed pide 20. No se firma lo que no se muestra. |
| Las URLs firmadas caducan a la hora y no se pueden cachear | TTL de 3600 s, `<img>` nativo y render por request dentro de `<Suspense>`. |
| La policy de padres se vuelve lenta con muchos posts | Índices `post_children(child_id)`, `posts(daycare_id, published_at)` y `post_photos(post_id)`. |
| Un `room_id` en un post que no es `room_wide` filtra de más | La policy de padres exige `room_wide = true`; un criterio lo verifica con un post de subconjunto. |
| `photo_consent` default `true` trata como consentido a un niño que nunca lo dio | La spec respeta el flag y no lo edita. El flujo de captura de consentimiento queda anotado como deuda de producto. |
| El re-encode WebP no está disponible en un navegador viejo | Fallback a `image/jpeg`; la extensión de la ruta y el MIME del blob cambian juntos. |
| PostgREST no resuelve un embed por el nombre de la constraint | Se usan FKs simples y hints explícitos (`users!posts_author_fkey`, `rooms!posts_room_fkey`); el criterio del feed lo detecta. |
| La RPC `security invoker` falla porque falta una policy de insert | El criterio de `create_post` válido corre con la sesión del staff y crea las tres filas. |
| La policy de insert de `post_children` entra en recursión con `posts_select_parent` | Las dos policies usan el helper `post_is_own` `security definer`; un criterio corre un `create_post` real y exige que no falle. |
| Solo hay 1 niño y 2 salas vacías, así que el selector se verifica con poco contenido | La verificación crea niños temporales por UI, prueba las tres salas y los borra al final. |
| El bucket privado rompe las capturas de Playwright por CORS o por expiración | Las firmas se generan en el servidor y las `<img>` apuntan al dominio de Supabase ya permitido; el criterio visual lo confirma. |
| `public.daycares` no tiene `SELECT` para `authenticated` y el header del feed falla con `permission denied` | `daycare_overview()` `security definer` devuelve solo la fila del usuario; el criterio del header lo verifica en runtime. |
| Borrar `_data/feed.ts` rompe `Brand`, la página o el badge | El plan toca los tres consumidores en los pasos 10–13 y cierra con un `grep` que exige cero imports. |
| El modal queda montado en todas las páginas de `(app)` y suma una consulta de audiencia | La consulta es de 2 selects livianos, va con `cache()` y no se ejecuta para `parent`. |

## What is **not** in this spec

- Editar, borrar o archivar publicaciones.
- Borradores, programación y publicación diferida.
- Notificaciones por email o push.
- Reacciones y comentarios funcionales.
- Feed y pantallas de padre.
- Captura o edición del consentimiento de fotos.
- Reordenar fotos, portada, álbumes, transformaciones y CDN.
- Moderación, reportes y borrado lógico.
- Videos, GIF, HEIC y cualquier formato fuera de JPG/PNG/WebP.
- Job de limpieza de archivos huérfanos.
- Tests automatizados, modo oscuro e i18n.

Cada uno de esos, si llega, va en su propia spec.

## Verification report

**Fecha:** 2026-10-27 · **Branch:** `spec-12-publicaciones-con-fotos` · **Agente:** `spec-verifier`
**Punto de partida:** `git status --short` con el trabajo de la spec sin commitear. No se commiteó, no se hizo stash y no se tocó `references/`.

### Comandos ejecutados

| Comando | Resultado | Evidencia |
| --- | --- | --- |
| `npm run build` (dev detenido) | exit 0 | `✓ Compiled successfully`, 6 rutas, Proxy detectado. `.playwright-mcp/build-12.log` |
| `npx tsc --noEmit` | exit 0, sin diagnósticos | `.playwright-mcp/tsc-12.log` |
| `npx eslint app` | exit 0, sin diagnósticos | `.playwright-mcp/eslint-12.log` |
| `grep` de `references/`, `_data/feed`, `any`, `@ts-ignore`, `style={{`, hex en `app/` | sin coincidencias | ver criterios 32, 33 y 54 |
| `git diff --name-only -- package.json package-lock.json` | vacío | criterio 54 |
| MCP `list_migrations` / `execute_sql` | 10 migraciones, 9 policies, 4 policies de Storage, 3 funciones | criterios 1–27 |
| Playwright MCP (Chromium 1440×900 y 390×600) | flujos completos | criterios 31, 34–53 |

### Contraste con la documentación

- **Context7 `/vercel/next.js`**: `revalidatePath` se llama dentro de la Server Function después de mutar; `app/(app)/posts/actions.ts` lo hace tras la RPC. Con Cache Components, `cookies()` y los datos de request van dentro de `<Suspense>`; `(app)/layout.tsx` y `page.tsx` respetan ese límite.
- **Docs vendorizadas 16.4.3**: `01-app/01-getting-started/07-mutating-data.md` (revalidatePath después de mutar) y `06-fetching-data.md` (contenido que espera datos dentro de `<Suspense>`).
- **Convenciones del repo:** sin `dynamic`/`revalidate`/`fetchCache`/`runtime`/`dynamicParams`; sin `postcss.config.*` ni `tailwind.config.*`; `<img>` nativo para URLs firmadas, con el disable justificado.

### Criterios (55/55 PASS)

| # | Criterio | Estado | Evidencia |
| --- | --- | --- | --- |
| 1 | 10 migraciones y archivos con la misma versión | PASS | `list_migrations` + 10 archivos `2026102802…`/`2026102803…`; `MISSING=` |
| 2 | Enum de 7 valores | PASS | `enum_range` = `{meal,nap,activity,achievement,mood,photo,announcement}` |
| 3 | USAGE del enum | PASS | `authenticated=true`, `anon=false` |
| 4 | Columnas 11/3/8 y RLS | PASS | `posts=11`, `post_children=3`, `post_photos=8`; `relrowsecurity=true` en las tres |
| 5 | Constraints | PASS | las 5 existen en `pg_constraint` |
| 6 | Trigger `posts_set_updated_at` | PASS | `tgname=posts_set_updated_at`, función `set_updated_at` |
| 7 | 9 policies | PASS | 3 de `posts`, 3 de `post_children`, 3 de `post_photos` |
| 8 | Sin policies de UPDATE/DELETE | PASS | `forbidden=0` |
| 9 | Grants | PASS | `authenticated`: `INSERT,SELECT`; `anon`: sin filas; sin `DELETE` |
| 10 | Bucket privado 5 MB y 3 MIME | PASS | `public=false`, `file_size_limit=5242880`, jpeg/png/webp |
| 11 | 4 policies de Storage sin UPDATE | PASS | select staff, select parent, insert staff, delete own |
| 12 | `create_post` invoker | PASS | `prosecdef=false`, `auth_exec=true`, `anon_exec=false` |
| 13 | `post_is_own` definer | PASS | `prosecdef=true`, `auth_exec=true`, `anon_exec=false` |
| 14 | `daycare_overview` definer | PASS | `prosecdef=true`; devolvió `Sala Soles`/`children_count` en la prueba |
| 15 | Sin recursión | PASS | `create_post` válido completó sin `infinite recursion` |
| 16 | Válido sin fotos | PASS | 1 post, 1 link, 0 fotos |
| 17 | 2 fotos | PASS | 2 filas, `position` 0/1, dimensiones 100×80 y 50×60 |
| 18 | 5 fotos | PASS | `ERROR 22023: too_many_photos` |
| 19 | Body de 9 | PASS | `ERROR 22023: invalid_body` |
| 20 | Niño de otra guardería | PASS | `ERROR 22023: invalid_children` |
| 21 | `room_wide=true` + subconjunto | PASS | `ERROR 22023: room_audience_mismatch` |
| 22 | `room_wide=false` + subconjunto (sala de 2) | PASS | 1 link, `room_wide=false`; tarjeta `Para: familia de Harly` |
| 23 | `room_wide=true` + toda la sala | PASS | 2 links, `room_wide=true`; tarjeta `Para: toda la sala Soles` |
| 24 | Consentimiento | PASS | con foto `photo_consent_required`; sin foto creó 1 post |
| 25 | Path ajeno | PASS | `ERROR 22023: invalid_photo_path` |
| 26 | Padre ve el post de Harly | PASS | visible `Solo Harly.`; `Solo Mateo.` no visible |
| 27 | Padre ve el post de sala | PASS | visible `Toda la sala.`; `Anuncio a Mateo.` no visible |
| 28 | `npm run build` | PASS | exit 0, ver comandos |
| 29 | `npx tsc --noEmit` | PASS | exit 0, sin salida |
| 30 | `npx eslint app` | PASS | exit 0, sin salida |
| 31 | Consola sin errores ni warnings | PASS | `Errors: 0, Warnings: 0` en `/` con el modal abierto y cerrado |
| 32 | `app/` sin `references/` | PASS | grep sin coincidencias |
| 33 | Sin `_data/feed` | PASS | grep sin coincidencias; `feed.ts` y `feed-audience.ts` eliminados |
| 34 | Sidebar `Sala Soles` | PASS | subtítulo leído de `daycare_overview()` |
| 35 | Header real | PASS | `GUARDERÍA · SALA SOLES`, `Buenas, Kevin`, `2 niños · martes 27 oct` |
| 36 | Feed vacío | PASS | `Todavía no hay publicaciones.` + subtítulo; sin `ANTERIORES` |
| 37 | Modal con 3 salas y chips de la sala | PASS | Soles seleccionada, 2 chips (Harly/Mateo), 7 tipos, foco en Harly |
| 38 | Cambio de sala | PASS | chips 0, sala desmarcada, `Esta sala no tiene niños.`; tipo, texto y preview conservados |
| 39 | "Toda la sala" | PASS | un chip, 2 vínculos, `room_id` de Soles, tarjeta `toda la sala Soles` |
| 40 | Sala sin niños | PASS | "Toda la sala" deshabilitada y mensaje visible |
| 41 | Publicar sin fotos | PASS | cierra, aparece en `PUBLICADO HOY`, 0 objetos en Storage |
| 42 | Publicar con 2 fotos | PASS | 2 objetos, 2 filas, grilla con 2 URLs firmadas |
| 43 | Sin subida al elegir | PASS | 2 previews `blob:`; sin requests a Storage |
| 44 | PDF y >5 MB | PASS | `Solo podés subir imágenes JPG, PNG o WebP.` y `Cada foto debe pesar menos de 5 MB.` |
| 45 | WebP, ≤2048 y menor | PASS | objetos `image/webp`, 2048×1024 y 1200×1600; 4.290/3.970 B < 10.303/7.907 B |
| 46 | Bloqueo por consentimiento | PASS | mensaje con `Harly`; Publicar no generó POST; modal abierto |
| 47 | Limpieza si falla la RPC | PASS | objeto borrado (objetos 6→6), modal abierto con el mensaje |
| 48 | Pendiente y Escape | PASS | `Publicando…`, botón deshabilitado, Escape no cerró; luego cerró al terminar |
| 49 | Footer sin "Editar" | PASS | 0 anchors y sin "Editar" en la tarjeta |
| 50 | Hoy vs anteriores | PASS | 4 posts en `PUBLICADO HOY` y 1 en `ANTERIORES` |
| 51 | Rol parent | PASS | 0 CTAs, sin composer ni `<dialog>`; `create_post` → `not_authorized` |
| 52 | 390×600 | PASS | `scrollWidth=380 < innerWidth=390`; 4 imágenes de grilla; lightbox 348×174 |
| 53 | Capturas | PASS | ver comparación visual abajo |
| 54 | Sin `any`/`style`/hex y package intacto | PASS | grep sin coincidencias; `git diff` de `package*.json` vacío |
| 55 | Cierre limpio | PASS | `posts=0`, `links=0`, `photos=0`, `children=1`, `objects=0` |

### Capturas (`.playwright-mcp/`)

- `spec-12-feed-1440.png` — feed real con tarjetas, badges y grilla de 4 fotos.
- `spec-12-composer-1440.png` — modal con SALA, PARA, TIPO, DESCRIPCIÓN y FOTOS.
- `spec-12-lightbox.png` — foto ampliada sobre el modal.
- `spec-12-feed-390.png` — feed a 390 px.
- `spec-12-lightbox-390.png` — lightbox a 390 px.
- `build-12.log`, `tsc-12.log`, `eslint-12.log`.

### Comparación visual

- **Feed** contra `references/screenshots/feed2.png`: coinciden shell, sidebar 248 px, fondo crema, tarjetas, tipografía Fredoka/Nunito, eyebrow, separador `PUBLICADO HOY` y footer. Diferencias esperadas por decisiones de la spec: autor real (`Kevin Calderon`) en lugar del niño, grilla de fotos real, sin "Editar" y contenido de prueba.
- **Composer**: `references/screenshots/compose2.png` es un detalle de post, no el modal. El modal se contrastó contra el diseño de SPEC 06 y el mockup `crear-publicacion.dc.html`: header Cancelar/título/Publicar, chips, textarea y azulejo punteado. La diferencia es el selector SALA y 2 chips reales en lugar de 3 mock.
- **Lightbox**: no hay referencia en `references/`; se verificaron apertura, foco, Escape y medidas a 1440 y 390, sin declarar paridad visual.

### Archivos modificados

- `app/(app)/layout.tsx`, `app/(app)/page.tsx`, `app/(app)/posts/actions.ts`.
- `app/_components/app-shell.tsx`, `app-sidebar.tsx`, `brand.tsx`, `app-shell-skeleton.tsx`.
- `app/_components/feed/post-form.tsx`, `post-composer-provider.tsx`, `post-type-badge.tsx`, `feed-post.tsx`, `post-photo-grid.tsx`, `feed-composer.tsx`.
- `app/_components/ui/modal-dialog.tsx`.
- `app/_data/post-types.ts`, `post-composer.ts`; eliminados `feed.ts` y `feed-audience.ts`.
- `app/_lib/posts.ts`, `post-queries.ts`.
- `utils/supabase/database.types.ts`, `supabase/README.md`.
- 10 archivos en `supabase/migrations/`.
- `specs/database/12-publicaciones-con-fotos.md` (casillas y este reporte).

En esta corrida de verificación no se modificó código de producto: solo este spec. La implementación ya estaba en la rama y sigue sin commit.

### Pendientes y riesgos

- **Estado:** la spec sigue en `Aprovado`. Con 55/55 PASS corresponde pasarla a `Implementado`; el cambio lo decide el usuario.
- **Riesgo latente (no cubierto por los criterios):** el branch de sala de `posts_select_parent` consulta `public.children`, y un padre no tiene policy de lectura ahí. Hoy el post `room_wide` también etiqueta a todos los niños, así que el padre lo ve por `post_children`; un niño que se sume a la sala **después** del post no lo vería por el branch de sala. Si se quiere cubrir ese caso, va con un helper `security definer` en la spec de padres.
- **Lightbox sin referencia visual:** no hay mockup de la foto ampliada; se validó comportamiento y medidas, no paridad.
- **Datos de prueba:** se crearon posts, un niño temporal y 6 objetos; se limpiaron al cierre (`children=1`, `objects=0`). Las capturas conservan datos de prueba.
- **Dev server:** detenido al terminar; navegador cerrado.
- **Working tree:** incluye archivos de OpenSpec y `skills-lock.json` ajenos a esta spec; no se tocaron.
