-- SPEC 10 — niños inscritos.
create table public.children (
  id            uuid primary key default gen_random_uuid(),
  daycare_id    uuid not null,
  room_id       uuid,
  full_name     text not null,
  birth_date    date not null,
  enrolled_at   date not null default current_date,
  medical_notes text,
  allergy_tags  text[] not null default '{}',
  photo_consent boolean not null default true,
  status        public.child_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint children_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint children_room_fkey foreign key (room_id, daycare_id)
    references public.rooms (id, daycare_id) on delete restrict,
  constraint children_full_name_length
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint children_medical_notes_length
    check (medical_notes is null or char_length(medical_notes) <= 500),
  constraint children_allergy_tags_format
    check (
      array_position(allergy_tags, '') is null
      and coalesce(array_length(allergy_tags, 1), 0) <= 12
    )
);

create index children_daycare_status_idx on public.children (daycare_id, status);
create index children_room_id_idx on public.children (room_id);

create trigger children_set_updated_at
before update on public.children
for each row execute function public.set_updated_at();

alter table public.children enable row level security;
revoke all on table public.children from anon, authenticated;
grant all on table public.children to service_role;
