-- SPEC 11 — enums de parentesco y estado de invitación.
-- Guarda sobre pg_type: `create type` no admite `if not exists`.
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'relationship_type' and n.nspname = 'public'
  ) then
    create type public.relationship_type as enum ('father', 'mother', 'guardian');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'invitation_status' and n.nspname = 'public'
  ) then
    create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');
  end if;
end
$$;

revoke all on type public.relationship_type, public.invitation_status
  from public, anon, authenticated;
grant usage on type public.relationship_type, public.invitation_status to service_role;
