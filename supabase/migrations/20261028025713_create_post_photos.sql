-- SPEC 12 — fotos de una publicación.
-- `storage_path` es la ruta relativa dentro del bucket privado, no una URL.
-- El check de formato exige {daycare_id}/{author_id}/{file_id}.{ext}.
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
