-- SPEC 11 — destino de la FK compuesta de invitations.
-- Mismo patrón que rooms_id_daycare_key de SPEC 10: impide invitar a un niño
-- de otra guardería.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.children'::regclass
      and conname = 'children_id_daycare_key'
  ) then
    alter table public.children
      add constraint children_id_daycare_key unique (id, daycare_id);
  end if;
end
$$;
