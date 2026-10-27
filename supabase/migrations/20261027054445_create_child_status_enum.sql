-- SPEC 10 — enum de estado del niño.
-- create type no admite if not exists: la guarda sobre pg_type permite re-aplicar.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'child_status' and n.nspname = 'public'
  ) then
    create type public.child_status as enum ('active', 'archived');
  end if;
end
$$;

revoke all on type public.child_status from public, anon, authenticated;
grant usage on type public.child_status to service_role;
