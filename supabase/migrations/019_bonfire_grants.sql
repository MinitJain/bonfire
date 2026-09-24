-- ============================================================
-- Bonfire v2: GRANT permissions for RPC functions
-- ============================================================
-- SECURITY DEFINER functions run as the function owner (postgres),
-- but we also grant explicit permissions to the anon and authenticated
-- roles so PostgREST can invoke the RPC functions.

GRANT SELECT ON public.bonfires TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Allow RPC invocations (PostgREST needs EXECUTE on the functions)
GRANT EXECUTE ON FUNCTION public.create_bonfire TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_timer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pause_timer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.skip_phase TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_phase TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_mode TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.end_bonfire TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_join_code TO anon, authenticated;
