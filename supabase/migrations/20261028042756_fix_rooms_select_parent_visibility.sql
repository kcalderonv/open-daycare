-- SPEC paneles-por-rol — corrección de rooms_select_parent.
-- La subquery directa a public.children dentro de una policy se evalúa con
-- RLS como el usuario actual: un padre no tiene policy sobre children, así
-- que el exists nunca era verdadero y la sala llegaba null al feed.
-- family_overview() es security definer y devuelve solo los hijos del usuario,
-- de modo que la policy queda acotada a las salas de esos hijos.
drop policy if exists rooms_select_parent on public.rooms;

create policy rooms_select_parent
on public.rooms
for select
to authenticated
using (
  id in (
    select f.room_id
    from public.family_overview() f
    where f.room_id is not null
  )
);
