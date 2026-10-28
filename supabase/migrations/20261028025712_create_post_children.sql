-- SPEC 12 — niños etiquetados en una publicación.
-- Es el driver del feed del padre. `daycare_id` permite validar la tenencia
-- sin depender de un join nullable.
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
