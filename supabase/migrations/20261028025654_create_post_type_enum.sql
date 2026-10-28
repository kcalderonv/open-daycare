-- SPEC 12 — enum de tipos de publicación.
-- Los 7 valores son los del composer de SPEC 06; `mood` no estaba en el diccionario.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'post_type' and n.nspname = 'public'
  ) then
    create type public.post_type as enum (
      'meal', 'nap', 'activity', 'achievement', 'mood', 'photo', 'announcement'
    );
  end if;
end
$$;

revoke all on type public.post_type from public, anon, authenticated;
grant usage on type public.post_type to service_role;
