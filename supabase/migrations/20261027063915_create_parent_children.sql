-- SPEC 11 — vínculo padre ↔ niño.
-- Sin daycare_id: el daycare se resuelve por children.daycare_id en las
-- policies. El insert no se concede a authenticated: lo hace accept_invitation.
create table public.parent_children (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid not null,
  child_id     uuid not null,
  relationship public.relationship_type not null,
  created_at   timestamptz not null default now(),

  constraint parent_children_parent_fkey foreign key (parent_id)
    references public.users (id) on delete cascade,
  constraint parent_children_child_fkey foreign key (child_id)
    references public.children (id) on delete restrict,
  constraint parent_children_parent_child_key unique (parent_id, child_id)
);

create index parent_children_child_id_idx on public.parent_children (child_id);

alter table public.parent_children enable row level security;
revoke all on table public.parent_children from anon, authenticated;
grant all on table public.parent_children to service_role;
