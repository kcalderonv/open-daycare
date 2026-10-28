-- SPEC 12 — creación transaccional de una publicación.
-- `security invoker`: corre con la sesión del usuario y las policies aplican.
-- El autor y el daycare no se reciben: salen de auth.uid() y del perfil.
create or replace function public.create_post(
  p_type      public.post_type,
  p_room_id   uuid,
  p_body      text,
  p_child_ids uuid[],
  p_photos    jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id    uuid := (select auth.uid());
  v_daycare_id uuid := (select public.current_staff_daycare_id());
  v_body       text := btrim(coalesce(p_body, ''));
  v_children   uuid[] := coalesce(p_child_ids, array[]::uuid[]);
  v_photos     jsonb := coalesce(p_photos, '[]'::jsonb);
  v_room_count int;
  v_post_id    uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_daycare_id is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if char_length(v_body) < 10 or char_length(v_body) > 600 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  if jsonb_array_length(v_photos) > 4 then
    raise exception 'too_many_photos' using errcode = '22023';
  end if;

  if p_room_id is not null and not exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.daycare_id = v_daycare_id
  ) then
    raise exception 'invalid_room' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_children) as t(child_id)
    where not exists (
      select 1 from public.children c
      where c.id = t.child_id
        and c.daycare_id = v_daycare_id
        and c.status = 'active'
        and (p_room_id is null or c.room_id = p_room_id)
    )
  ) then
    raise exception 'invalid_children' using errcode = '22023';
  end if;

  if p_room_id is not null then
    select count(*) into v_room_count
    from public.children c
    where c.room_id = p_room_id
      and c.daycare_id = v_daycare_id
      and c.status = 'active';

    if v_room_count <> coalesce(array_length(v_children, 1), 0) then
      raise exception 'room_audience_mismatch' using errcode = '22023';
    end if;
  end if;

  if jsonb_array_length(v_photos) > 0 and exists (
    select 1 from public.children c
    where c.id = any(v_children) and not c.photo_consent
  ) then
    raise exception 'photo_consent_required' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_photos) as t(photo)
    where coalesce(t.photo ->> 'path', '') not like
      v_daycare_id::text || '/' || v_user_id::text || '/%'
  ) then
    raise exception 'invalid_photo_path' using errcode = '22023';
  end if;

  insert into public.posts (daycare_id, author_id, room_id, type, body)
  values (v_daycare_id, v_user_id, p_room_id, p_type, v_body)
  returning id into v_post_id;

  insert into public.post_children (post_id, child_id, daycare_id)
  select v_post_id, t.child_id, v_daycare_id
  from (select distinct child_id from unnest(v_children) as u(child_id)) as t
  on conflict do nothing;

  insert into public.post_photos (post_id, daycare_id, storage_path, width, height, position)
  select
    v_post_id,
    v_daycare_id,
    t.photo ->> 'path',
    nullif(t.photo ->> 'width', '')::int,
    nullif(t.photo ->> 'height', '')::int,
    (t.ord - 1)::smallint
  from jsonb_array_elements(v_photos) with ordinality as t(photo, ord);

  return v_post_id;
end;
$$;

revoke all on function public.create_post(public.post_type, uuid, text, uuid[], jsonb)
  from public, anon;
grant execute on function public.create_post(public.post_type, uuid, text, uuid[], jsonb)
  to authenticated;
