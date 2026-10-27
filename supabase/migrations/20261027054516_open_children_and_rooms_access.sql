-- SPEC 10 — acceso de staff/admin a salas y niños.
-- La referencia al daycare va calificada: sin el prefijo, daycare_id dentro
-- del subquery resuelve a users.daycare_id y la policy no filtra nada.
drop policy if exists rooms_select_staff on public.rooms;

create policy rooms_select_staff
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = rooms.daycare_id
  )
);

grant select on table public.rooms to authenticated;

drop policy if exists children_select_staff on public.children;
drop policy if exists children_insert_staff on public.children;
drop policy if exists children_update_staff on public.children;

create policy children_select_staff
on public.children
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
);

create policy children_insert_staff
on public.children
for insert
to authenticated
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
);

create policy children_update_staff
on public.children
for update
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'staff')
      and u.daycare_id = children.daycare_id
  )
);

grant select, insert, update on table public.children to authenticated;
grant usage on type public.child_status to authenticated;
