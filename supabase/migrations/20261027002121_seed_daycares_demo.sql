-- SPEC 07 — Seed demo de daycares
insert into public.daycares (name, slug, country, timezone, locale, status)
values ('Sala Soles', 'sala-soles', 'PE', 'America/Lima', 'es-PE', 'active')
on conflict (slug) do nothing;
