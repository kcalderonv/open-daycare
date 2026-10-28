-- SPEC 12 — corta la recursión entre post_children y posts.
-- La policy de insert de post_children no puede consultar posts: la policy de
-- lectura del padre en posts consulta post_children y Postgres reentra.
create or replace function public.post_is_own(p_post_id uuid, p_daycare_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.posts p
    where p.id = p_post_id
      and p.daycare_id = p_daycare_id
      and p.author_id = (select auth.uid())
  );
$$;

revoke all on function public.post_is_own(uuid, uuid) from public, anon;
grant execute on function public.post_is_own(uuid, uuid) to authenticated;

drop policy if exists post_children_insert_staff on public.post_children;

create policy post_children_insert_staff
on public.post_children for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and public.post_is_own(post_children.post_id, post_children.daycare_id)
  and exists (
    select 1 from public.children c
    where c.id = post_children.child_id
      and c.daycare_id = post_children.daycare_id
      and c.status = 'active'
  )
);

drop policy if exists post_photos_insert_staff on public.post_photos;

create policy post_photos_insert_staff
on public.post_photos for insert to authenticated
with check (
  daycare_id = (select public.current_staff_daycare_id())
  and public.post_is_own(post_photos.post_id, post_photos.daycare_id)
  and split_part(post_photos.storage_path, '/', 1) = post_photos.daycare_id::text
  and split_part(post_photos.storage_path, '/', 2) = (select auth.uid())::text
);
