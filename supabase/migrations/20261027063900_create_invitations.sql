-- SPEC 11 — invitaciones de padres.
-- sent_at null = creada pero no entregada a Resend; habilita el reintento
-- con el mismo código. El índice parcial permite una sola pendiente por
-- niño y email; la app normaliza vencidas antes de insertar.
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  daycare_id   uuid not null,
  child_id     uuid not null,
  invited_by   uuid not null,
  full_name    text not null,
  email        text not null,
  relationship public.relationship_type not null,
  code         text not null,
  status       public.invitation_status not null default 'pending',
  expires_at   timestamptz not null default now() + interval '7 days',
  sent_at      timestamptz,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint invitations_daycare_fkey foreign key (daycare_id)
    references public.daycares (id) on delete restrict,
  constraint invitations_child_fkey foreign key (child_id, daycare_id)
    references public.children (id, daycare_id) on delete restrict,
  constraint invitations_invited_by_fkey foreign key (invited_by)
    references public.users (id) on delete restrict,
  constraint invitations_code_key unique (code),
  constraint invitations_full_name_length
    check (char_length(btrim(full_name)) between 2 and 120),
  constraint invitations_email_format
    check (
      email = lower(email)
      and char_length(email) <= 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}$'
    ),
  constraint invitations_code_format check (code ~ '^[A-Z0-9]{5}$'),
  constraint invitations_accepted_at
    check ((status = 'accepted') = (accepted_at is not null)),
  constraint invitations_sent_at
    check (sent_at is null or sent_at >= created_at)
);

create unique index invitations_pending_child_email_key
  on public.invitations (child_id, lower(email))
  where status = 'pending';

create index invitations_daycare_status_idx
  on public.invitations (daycare_id, status);
create index invitations_child_id_idx on public.invitations (child_id);

create trigger invitations_set_updated_at
before update on public.invitations
for each row execute function public.set_updated_at();

alter table public.invitations enable row level security;
revoke all on table public.invitations from anon, authenticated;
grant all on table public.invitations to service_role;
