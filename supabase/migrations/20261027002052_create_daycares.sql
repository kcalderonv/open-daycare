-- SPEC 07 — Primera tabla daycares
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

alter table public.daycares enable row level security;
revoke all on table public.daycares from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant all on table public.daycares to service_role;
