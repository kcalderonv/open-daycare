-- El perfil de public.users comparte el UUID de auth.users y vive mientras viva el usuario de Auth.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_auth_fkey'
  ) then
    alter table public.users
      add constraint users_auth_fkey foreign key (id)
      references auth.users (id) on delete cascade;
  end if;
end
$$;
