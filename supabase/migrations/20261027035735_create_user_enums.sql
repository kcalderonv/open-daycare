-- SPEC 08 — Enums de usuario
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role' and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('admin', 'staff', 'parent');
  end if;

  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_status' and n.nspname = 'public'
  ) then
    create type public.user_status as enum ('pending', 'active');
  end if;
end
$$;
