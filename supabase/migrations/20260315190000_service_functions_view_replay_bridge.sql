-- Replay bridge for migration 093.
-- Migration 065 expands service_functions_view with extra metadata columns,
-- then 093 attempts to narrow the view with CREATE OR REPLACE VIEW. Postgres
-- rejects that shape change when columns would be dropped, so replay must
-- clear the view first and let 093 recreate it in its historical definition.
-- In linked environments where 096 already ran, legacy compatibility objects
-- exist and this bridge must no-op so the live convenience view stays intact.

do $$
begin
  if to_regclass('public.registry_services') is null
     and to_regclass('public.registry_service_functions') is null
     and to_regclass('public.user_service_runs') is null
     and to_regclass('public.service_functions_view') is not null then
    execute 'drop view public.service_functions_view';
  end if;
end
$$;
