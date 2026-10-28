-- SPEC paneles-por-rol — datos de la familia para el panel.
-- Patrón de get_invitation_preview: siempre devuelve al menos una fila.
-- "Sin hijos" es un estado (child_id null), no un error. Un usuario de staff
-- no obtiene filas porque el where exige role = 'parent'.
create or replace function public.family_overview()
returns table (
  daycare_name text,
  child_id uuid,
  first_name text,
  room_id uuid,
  room_name text,
  relationship public.relationship_type
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.name,
    c.id,
    split_part(c.full_name, ' ', 1),
    c.room_id,
    r.name,
    px.relationship
  from public.users u
  join public.daycares d on d.id = u.daycare_id
  left join public.parent_children px on px.parent_id = u.id
  left join public.children c on c.id = px.child_id
  left join public.rooms r on r.id = c.room_id
  where u.id = (select auth.uid())
    and u.role = 'parent'
    and u.status = 'active'
  order by c.full_name nulls last;
$$;

revoke all on function public.family_overview() from public, anon;
grant execute on function public.family_overview() to authenticated;
