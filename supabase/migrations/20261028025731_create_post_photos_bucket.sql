-- SPEC 12 — bucket privado de fotos de publicaciones.
-- La ruta {daycare_id}/{author_id}/{file_id}.{ext} permite policies por
-- prefijo sin joins costosos en el camino de escritura.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists post_photos_objects_select_staff on storage.objects;
drop policy if exists post_photos_objects_select_parent on storage.objects;
drop policy if exists post_photos_objects_insert_staff on storage.objects;
drop policy if exists post_photos_objects_delete_own on storage.objects;

create policy post_photos_objects_select_staff
on storage.objects for select to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = (select public.current_staff_daycare_id())::text
);

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
          p.type = 'announcement'
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

create policy post_photos_objects_insert_staff
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = (select public.current_staff_daycare_id())::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy post_photos_objects_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);
