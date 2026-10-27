-- Usuario demo de Supabase Auth, enlazado al perfil de public.users de SPEC 08.
-- Idempotente: no inserta nada si el id o el email ya existen.
do $$
declare
  demo_id    constant uuid := 'd3f1c0a2-7b4e-4c8a-9b1d-2e6f5a0c8b7d';
  demo_email constant text := 'caro@opendaycare.com';
begin
  if exists (
    select 1 from auth.users
    where id = demo_id or email = demo_email
  ) then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_confirm_status, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    demo_id,
    'authenticated',
    'authenticated',
    demo_email,
    extensions.crypt('opendaycare2026', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', 'Caro Rojas'),
    '', '', '', '',
    0, false, false
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    demo_id::text,
    demo_id,
    jsonb_build_object(
      'sub', demo_id::text,
      'email', demo_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email', now(), now(), now()
  )
  on conflict (provider_id, provider) do nothing;
end
$$;
