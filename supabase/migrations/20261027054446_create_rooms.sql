-- SPEC 10 — salas de la guardería.
create table public.rooms (
  id         uuid primary key default gen_random_uuid(),
  daycare_id uuid not null,
  name       text not null,
  slug       text not null,
  position   smallint not null default 0,
  created_at timestamptz not null default now(),

  constraint rooms_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint rooms_daycare_slug_key unique (daycare_id, slug),
  constraint rooms_id_daycare_key unique (id, daycare_id),
  constraint rooms_name_length check (char_length(btrim(name)) between 2 and 60),
  constraint rooms_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint rooms_position check (position >= 0)
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

alter table public.rooms enable row level security;
revoke all on table public.rooms from anon, authenticated;
grant all on table public.rooms to service_role;
