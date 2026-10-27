-- SPEC 08 — Seed demo de usuarios
insert into public.users (id, daycare_id, role, status, full_name)
select
  'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d'::uuid,
  d.id,
  'admin'::public.user_role,
  'active'::public.user_status,
  'Caro Rojas'
from public.daycares d
where d.slug = 'sala-soles'
on conflict (id) do nothing;
