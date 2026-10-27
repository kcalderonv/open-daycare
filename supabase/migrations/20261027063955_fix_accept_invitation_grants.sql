-- SPEC 11 — Supabase aplica default privileges de EXECUTE a anon al crear
-- funciones. El tramo anónimo solo necesita get_invitation_preview;
-- accept_invitation exige sesión y su grant a anon se cierra acá.
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;
