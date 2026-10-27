-- SPEC 11 — tramo anónimo de la activación.
-- get_invitation_preview devuelve siempre una fila: "no existe" es un estado.
-- accept_invitation valida el email del JWT contra el de la invitación.
create or replace function public.get_invitation_preview(p_code text)
returns table (
  status text,
  parent_full_name text,
  child_first_name text,
  child_full_name text,
  room_name text,
  email text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when i.id is null then 'not_found'
      when i.status = 'pending' and i.expires_at <= now() then 'expired'
      else i.status::text
    end,
    coalesce(i.full_name, ''),
    coalesce(split_part(c.full_name, ' ', 1), ''),
    coalesce(c.full_name, ''),
    coalesce(r.name, ''),
    coalesce(i.email, '')
  from (values (1)) as base(x)
  left join public.invitations i on i.code = upper(btrim(p_code))
  left join public.children c on c.id = i.child_id
  left join public.rooms r on r.id = c.room_id;
$$;

revoke all on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to anon, authenticated;

create or replace function public.accept_invitation(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   uuid := (select auth.uid());
  v_email     text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_inv       public.invitations;
  v_full_name text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_inv
  from public.invitations i
  where i.code = upper(btrim(p_code))
  for update;

  if not found
     or v_inv.status <> 'pending'
     or v_inv.expires_at <= now()
     or lower(v_inv.email) <> v_email then
    raise exception 'invitation_not_available' using errcode = 'P0001';
  end if;

  v_full_name := coalesce(
    nullif(btrim((select u.raw_user_meta_data ->> 'full_name'
                  from auth.users u where u.id = v_user_id)), ''),
    v_inv.full_name
  );

  insert into public.users (id, daycare_id, role, status, full_name)
  values (v_user_id, v_inv.daycare_id, 'parent', 'active', v_full_name)
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.users u
    where u.id = v_user_id and u.role = 'parent' and u.status = 'active'
  ) then
    raise exception 'account_not_eligible' using errcode = 'P0001';
  end if;

  insert into public.parent_children (parent_id, child_id, relationship)
  values (v_user_id, v_inv.child_id, v_inv.relationship)
  on conflict (parent_id, child_id) do nothing;

  update public.children
  set photo_consent = true
  where id = v_inv.child_id;

  update public.invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;

create or replace function public.email_has_account(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if (select public.current_staff_daycare_id()) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return exists (
    select 1 from auth.users u
    where lower(u.email) = lower(btrim(p_email))
  );
end;
$$;

revoke all on function public.email_has_account(text) from public, anon;
grant execute on function public.email_has_account(text) to authenticated;
