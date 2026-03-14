insert into public.registry_source_types (source_type, description, sort_order)
values (
  'binary',
  'Generic uploaded asset type for files stored on platform without a parse/extract route.',
  coalesce((select max(sort_order) + 1 from public.registry_source_types), 1)
)
on conflict (source_type) do update
set description = excluded.description;
