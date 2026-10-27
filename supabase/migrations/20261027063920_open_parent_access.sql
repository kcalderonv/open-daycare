-- SPEC 11 — acceso de staff y padres a invitaciones y vínculos.
-- current_staff_daycare_id() es security definer porque una policy sobre
-- public.users que consulte public.users entra en recursión infinita bajo RLS.
create or replace function public.current_staff_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.daycare_id
  from public.users u
  where u.id = (select auth.uid())
    and u.status = 'active'
    and u.role in ('admin', 'staff');
$$;

revoke all on function public.current_staff_daycare_id() from public, anon;
grant execute on function public.current_staff_daycare_id() to authenticated;

drop policy if exists invitations_select_staff on public.invitations;
drop policy if exists invitations_insert_staff on public.invitations;
drop policy if exists invitations_update_staff on public.invitations;

create policy invitations_select_staff
on public.invitations for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy invitations_insert_staff
on public.invitations for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and invited_by = (select auth.uid())
  and exists (
    select 1 from public.children c
    where c.id = invitations.child_id
      and c.daycare_id = invitations.daycare_id
      and c.status = 'active'
  )
);

create policy invitations_update_staff
on public.invitations for update to authenticated
using (daycare_id = (select public.current_staff_daycare_id()))
with check (daycare_id = (select public.current_staff_daycare_id()));

drop policy if exists parent_children_select_staff on public.parent_children;
drop policy if exists parent_children_select_own on public.parent_children;

create policy parent_children_select_staff
on public.parent_children for select to authenticated
using (
  exists (
    select 1 from public.children c
    where c.id = parent_children.child_id
      and c.daycare_id = (select public.current_staff_daycare_id())
  )
);

create policy parent_children_select_own
on public.parent_children for select to authenticated
using (parent_id = (select auth.uid()));

drop policy if exists users_select_daycare_parents on public.users;

create policy users_select_daycare_parents
on public.users for select to authenticated
using (
  role = 'parent'
  and daycare_id = (select public.current_staff_daycare_id())
);

grant select, insert, update on table public.invitations to authenticated;
grant select on table public.parent_children to authenticated;
grant usage on type public.relationship_type, public.invitation_status to authenticated;
