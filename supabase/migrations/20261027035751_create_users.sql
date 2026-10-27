-- SPEC 08 — Tabla de usuarios
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

alter table public.users enable row level security;
revoke all on table public.users from anon, authenticated;
grant all on table public.users to service_role;
revoke all on type public.user_role, public.user_status from public, anon, authenticated;
grant usage on type public.user_role, public.user_status to service_role;
