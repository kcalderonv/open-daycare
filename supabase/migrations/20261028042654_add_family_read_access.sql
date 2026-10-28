-- SPEC paneles-por-rol — lectura acotada para el panel de familia.
-- current_daycare_id() no filtra por rol: el panel de familia necesita el
-- daycare del usuario activo, y current_staff_daycare_id() devuelve null para
-- un padre por diseño. Es security definer y con search_path fijo porque una
-- policy sobre public.users que consulte public.users entra en recursión.
create or replace function public.current_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.daycare_id
  from public.users u
  where u.id = (select auth.uid())
    and u.status = 'active';
$$;

revoke all on function public.current_daycare_id() from public, anon;
grant execute on function public.current_daycare_id() to authenticated;

-- El padre solo lee filas de admin/staff activas de su propia guardería, para
-- resolver el autor de una publicación ("Maestra Caro").
drop policy if exists users_select_staff_of_daycare on public.users;

create policy users_select_staff_of_daycare
on public.users
for select
to authenticated
using (
  role in ('admin', 'staff')
  and status = 'active'
  and daycare_id = (select public.current_daycare_id())
);

-- El padre solo lee las salas donde tiene un hijo vinculado, para resolver la
-- sala del autor y los anuncios de sala dentro del feed.
drop policy if exists rooms_select_parent on public.rooms;

create policy rooms_select_parent
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.children c
    join public.parent_children px on px.child_id = c.id
    where c.room_id = rooms.id
      and c.daycare_id = rooms.daycare_id
      and px.parent_id = (select auth.uid())
  )
);
