-- SPEC 10 — tres salas demo para sala-soles. No crea niños.
insert into public.rooms (daycare_id, name, slug, position)
select d.id, v.name, v.slug, v.position
from public.daycares d
cross join (
  values
    ('Soles', 'soles', 1::smallint),
    ('Lunas', 'lunas', 2::smallint),
    ('Estrellas', 'estrellas', 3::smallint)
) as v(name, slug, position)
where d.slug = 'sala-soles'
on conflict (daycare_id, slug) do nothing;
