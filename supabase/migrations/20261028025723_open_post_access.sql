-- SPEC 12 — acceso a publicaciones.
-- El anuncio de sala es el único que alcanza a toda la sala por `room_id`.
-- Sin esa condición, un post a dos niños sería visible para todos los padres
-- de la sala solo por tener `room_id`.
drop policy if exists posts_select_staff on public.posts;
drop policy if exists posts_select_parent on public.posts;
drop policy if exists posts_insert_staff on public.posts;

create policy posts_select_staff
on public.posts for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

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
    posts.type = 'announcement'
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

create policy posts_insert_staff
on public.posts for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and author_id = (select auth.uid())
  and (
    room_id is null
    or exists (
      select 1 from public.rooms r
      where r.id = posts.room_id and r.daycare_id = posts.daycare_id
    )
  )
);

drop policy if exists post_children_select_staff on public.post_children;
drop policy if exists post_children_select_parent on public.post_children;
drop policy if exists post_children_insert_staff on public.post_children;

create policy post_children_select_staff
on public.post_children for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy post_children_select_parent
on public.post_children for select to authenticated
using (
  exists (
    select 1 from public.parent_children px
    where px.child_id = post_children.child_id
      and px.parent_id = (select auth.uid())
  )
);

create policy post_children_insert_staff
on public.post_children for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and exists (
    select 1 from public.posts p
    where p.id = post_children.post_id
      and p.daycare_id = post_children.daycare_id
      and p.author_id = (select auth.uid())
  )
  and exists (
    select 1 from public.children c
    where c.id = post_children.child_id
      and c.daycare_id = post_children.daycare_id
      and c.status = 'active'
  )
);

drop policy if exists post_photos_select_staff on public.post_photos;
drop policy if exists post_photos_select_parent on public.post_photos;
drop policy if exists post_photos_insert_staff on public.post_photos;

create policy post_photos_select_staff
on public.post_photos for select to authenticated
using (daycare_id = (select public.current_staff_daycare_id()));

create policy post_photos_select_parent
on public.post_photos for select to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
  )
);

create policy post_photos_insert_staff
on public.post_photos for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and exists (
    select 1 from public.posts p
    where p.id = post_photos.post_id
      and p.daycare_id = post_photos.daycare_id
      and p.author_id = (select auth.uid())
  )
  and split_part(post_photos.storage_path, '/', 1) = post_photos.daycare_id::text
  and split_part(post_photos.storage_path, '/', 2) = (select auth.uid())::text
);

grant select, insert on table public.posts to authenticated;
grant select, insert on table public.post_children to authenticated;
grant select, insert on table public.post_photos to authenticated;
grant usage on type public.post_type to authenticated;
