-- Un usuario autenticado solo puede leer su propio perfil.
drop policy if exists users_select_own on public.users;

create policy users_select_own
on public.users
for select
to authenticated
using (id = (select auth.uid()));

grant select on table public.users to authenticated;
grant usage on type public.user_role, public.user_status to authenticated;
