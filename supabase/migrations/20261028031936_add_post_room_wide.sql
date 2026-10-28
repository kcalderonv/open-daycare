-- SPEC 12 — distingue "toda la sala" de un subconjunto de niños.
-- Sin este flag, room_id obligatorio + snapshot exacto impedían publicar a un
-- subconjunto en una sala con más de un niño.
alter table public.posts
  add column if not exists room_wide boolean not null default false;

drop function if exists public.create_post(public.post_type, uuid, text, uuid[], jsonb);

create or replace function public.create_post(
  p_type      public.post_type,
  p_room_id   uuid,
  p_body      text,
  p_child_ids uuid[],
  p_photos    jsonb,
  p_room_wide boolean
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

  if p_room_id is null and p_room_wide then
    raise exception 'invalid_room' using errcode = '22023';
  end if;

  if p_room_id is not null and not exists (
    select 1 from public.rooms r
    where r.id = p_room_id and r.daycare_id = v_daycare_id
  ) then
    raise exception 'invalid_room' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct child_id), array[]::uuid[])
  into v_children
  from unnest(v_children) as t(child_id);

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

  if p_room_wide and p_room_id is not null then
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

  insert into public.posts (daycare_id, author_id, room_id, room_wide, type, body)
  values (v_daycare_id, v_user_id, p_room_id, p_room_wide, p_type, v_body)
  returning id into v_post_id;

  insert into public.post_children (post_id, child_id, daycare_id)
  select v_post_id, t.child_id, v_daycare_id
  from unnest(v_children) as t(child_id)
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

revoke all on function public.create_post(public.post_type, uuid, text, uuid[], jsonb, boolean)
  from public, anon;
grant execute on function public.create_post(public.post_type, uuid, text, uuid[], jsonb, boolean)
  to authenticated;

drop policy if exists posts_select_parent on public.posts;

create policy posts_select_parent
on public.posts for select to authenticated
using (
  exists (
    select 1
    from public.post_children pc
    join public.parent_children px on px.child_id = pc.child_id
    where pc.post_id = posts.id
      and px.parent_id = (select auth.uid())
  )
  or (
    posts.room_wide
    and posts.room_id is not null
    and exists (
      select 1
      from public.children c
      join public.parent_children px on px.child_id = c.id
      where c.room_id = posts.room_id
        and c.daycare_id = posts.daycare_id
        and px.parent_id = (select auth.uid())
    )
  )
);

drop policy if exists post_photos_objects_select_parent on storage.objects;

create policy post_photos_objects_select_parent
on storage.objects for select to authenticated
using (
  bucket_id = 'post-photos'
  and exists (
    select 1
    from public.post_photos pp
    join public.posts p on p.id = pp.post_id
    where pp.storage_path = storage.objects.name
      and (
        exists (
          select 1
          from public.post_children pc
          join public.parent_children px on px.child_id = pc.child_id
          where pc.post_id = p.id
            and px.parent_id = (select auth.uid())
        )
        or (
          p.room_wide
          and p.room_id is not null
          and exists (
            select 1
            from public.children c
            join public.parent_children px on px.child_id = c.id
            where c.room_id = p.room_id
              and c.daycare_id = p.daycare_id
              and px.parent_id = (select auth.uid())
          )
        )
      )
  )
);
