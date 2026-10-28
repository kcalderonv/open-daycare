-- SPEC 12 — publicaciones del staff.
-- `daycare_id` no está en el diccionario: sin él la RLS de un post sin sala
-- dependería de un join nullable. `title` se crea y nunca se escribe.
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  daycare_id   uuid not null,
  author_id    uuid not null,
  room_id      uuid,
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
