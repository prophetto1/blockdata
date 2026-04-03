-- Replay bridge for migration 096.
-- Fresh replay reaches 096 with canonical service_* tables already present,
-- while 096 expects the pre-cutover registry_services / user_service_runs
-- table names. In linked environments where 096 already ran, the legacy
-- compatibility objects exist and this bridge must no-op.

do $$
begin
  if to_regclass('public.registry_services') is null
     and to_regclass('public.registry_service_functions') is null
     and to_regclass('public.user_service_runs') is null
     and to_regclass('public.service_registry') is not null
     and to_regclass('public.service_functions') is not null
     and to_regclass('public.service_runs') is not null then
    execute 'drop policy if exists service_type_catalog_select on public.service_type_catalog';
    execute 'drop policy if exists service_type_catalog_service_role on public.service_type_catalog';
    execute 'drop policy if exists service_run_items_select on public.service_run_items';
    execute 'drop policy if exists service_run_items_service_role on public.service_run_items';
    execute 'alter table public.service_registry rename to registry_services';
    execute 'alter table public.service_functions rename to registry_service_functions';
    execute 'alter table public.service_runs rename to user_service_runs';
  end if;
end
$$;
