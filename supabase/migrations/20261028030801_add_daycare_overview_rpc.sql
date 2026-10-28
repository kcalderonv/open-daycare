-- SPEC 12 — nombre y conteo del daycare para el header del feed.
-- public.daycares no tiene SELECT para authenticated y abrirla expondría la
-- tabla entera; la función devuelve solo la fila del usuario.
create or replace function public.daycare_overview()
returns table (name text, children_count int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    d.name,
    (
      select count(*)::int
      from public.children c
      where c.daycare_id = d.id
        and c.status = 'active'
    ) as children_count
  from public.daycares d
  join public.users u on u.daycare_id = d.id
  where u.id = (select auth.uid())
    and u.status = 'active';
$$;

revoke all on function public.daycare_overview() from public, anon;
grant execute on function public.daycare_overview() to authenticated;
