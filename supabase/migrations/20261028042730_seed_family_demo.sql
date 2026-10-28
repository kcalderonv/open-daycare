-- SPEC paneles-por-rol — seed demo de la familia Fernández.
-- Idempotente: ids fijos y on conflict do nothing, igual que seed_users_demo.
-- La contraseña demo es la misma del usuario de staff y se documenta en README.
do $$
declare
  v_parent_id  constant uuid := 'f4a1b7c2-3d5e-4f60-8a91-b2c3d4e5f601';
  v_parent_email constant text := 'lucia.fernandez@opendaycare.com';
  v_author_id  constant uuid := 'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d';
  v_mateo_id   constant uuid := 'a1b2c3d4-0001-4a00-9000-000000000001';
  v_sofia_id   constant uuid := 'a1b2c3d4-0002-4a00-9000-000000000002';
  v_post_mateo constant uuid := 'b1c2d3e4-0001-4b00-9000-000000000001';
  v_post_sofia constant uuid := 'b1c2d3e4-0002-4b00-9000-000000000002';
  v_post_room  constant uuid := 'b1c2d3e4-0003-4b00-9000-000000000003';
  v_daycare_id uuid;
  v_room_id    uuid;
begin
  if exists (
    select 1 from auth.users
    where id = v_parent_id or email = v_parent_email
  ) then
    null;
  else
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_confirm_status, is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_parent_id,
      'authenticated',
      'authenticated',
      v_parent_email,
      extensions.crypt('opendaycare2026', extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Lucía Fernández'),
      '', '', '', '',
      0, false, false
    );

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_parent_id::text,
      v_parent_id,
      jsonb_build_object(
        'sub', v_parent_id::text,
        'email', v_parent_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email', now(), now(), now()
    )
    on conflict (provider_id, provider) do nothing;
  end if;

  select d.id, r.id into v_daycare_id, v_room_id
  from public.daycares d
  join public.rooms r on r.daycare_id = d.id and r.slug = 'soles'
  where d.slug = 'sala-soles';

  insert into public.users (id, daycare_id, role, status, full_name)
  values (v_parent_id, v_daycare_id, 'parent', 'active', 'Lucía Fernández')
  on conflict (id) do nothing;

  insert into public.children (id, daycare_id, room_id, full_name, birth_date)
  values
    (v_mateo_id, v_daycare_id, v_room_id, 'Mateo Fernández', '2022-03-14'),
    (v_sofia_id, v_daycare_id, v_room_id, 'Sofía Fernández', '2023-08-02')
  on conflict (id) do nothing;

  insert into public.parent_children (parent_id, child_id, relationship)
  values
    (v_parent_id, v_mateo_id, 'mother'),
    (v_parent_id, v_sofia_id, 'mother')
  on conflict (parent_id, child_id) do nothing;

  insert into public.posts (id, daycare_id, author_id, room_id, type, body, published_at, room_wide)
  values
    (
      v_post_mateo, v_daycare_id, v_author_id, v_room_id, 'achievement',
      '¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.',
      ((now() at time zone 'America/Lima')::date + time '14:56') at time zone 'America/Lima',
      false
    ),
    (
      v_post_sofia, v_daycare_id, v_author_id, v_room_id, 'activity',
      'Pintamos con témperas esta mañana. Sofía eligió el azul para todo y se concentró un montón mezclando colores.',
      ((now() at time zone 'America/Lima')::date + time '14:20') at time zone 'America/Lima',
      false
    ),
    (
      v_post_room, v_daycare_id, v_author_id, v_room_id, 'announcement',
      'El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.',
      ((now() at time zone 'America/Lima')::date + time '07:50') at time zone 'America/Lima',
      true
    )
  on conflict (id) do nothing;

  insert into public.post_children (post_id, child_id, daycare_id)
  values
    (v_post_mateo, v_mateo_id, v_daycare_id),
    (v_post_sofia, v_sofia_id, v_daycare_id)
  on conflict (post_id, child_id) do nothing;

  -- Anuncio de sala: snapshot de todos los niños activos de Soles.
  insert into public.post_children (post_id, child_id, daycare_id)
  select v_post_room, c.id, c.daycare_id
  from public.children c
  where c.daycare_id = v_daycare_id
    and c.room_id = v_room_id
    and c.status = 'active'
  on conflict (post_id, child_id) do nothing;
end
$$;
