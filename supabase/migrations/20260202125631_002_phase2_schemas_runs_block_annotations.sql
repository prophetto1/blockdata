-- Migration: 002_phase2_schemas_runs_block_annotations
-- Phase 2: user-defined schemas + per-run per-block annotations (multi-schema-per-document).

create table public.schemas (
  schema_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  schema_ref text not null,
  schema_uid text not null,
  schema_jsonb jsonb not null,
  created_at timestamptz not null default now(),

  constraint schemas_schema_uid_hex check (schema_uid ~ '^[0-9a-f]{64}$'),
  constraint schemas_schema_ref_format check (schema_ref ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  constraint schemas_unique_owner_ref unique (owner_id, schema_ref),
  constraint schemas_unique_owner_uid unique (owner_id, schema_uid)
);

create table public.annotation_runs (
  run_id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  doc_uid text not null references public.documents(doc_uid) on delete cascade,
  schema_id uuid not null references public.schemas(schema_id) on delete restrict,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_blocks integer not null,
  completed_blocks integer not null default 0,
  failed_blocks integer not null default 0,
  failure_log jsonb not null default '[]'::jsonb,

  constraint annotation_runs_status check (status = any (array['running','complete','failed','cancelled'])),
  constraint annotation_runs_counters_nonneg check (
    total_blocks >= 0 and completed_blocks >= 0 and failed_blocks >= 0
  )
);

create index idx_annotation_runs_owner_started_at on public.annotation_runs using btree (owner_id, started_at desc);
create index idx_annotation_runs_doc_started_at on public.annotation_runs using btree (doc_uid, started_at desc);

create table public.block_annotations (
  run_id uuid not null references public.annotation_runs(run_id) on delete cascade,
  block_uid text not null references public.blocks(block_uid) on delete cascade,
  annotation_jsonb jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  claimed_by text,
  claimed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,

  primary key (run_id, block_uid),
  constraint block_annotations_status check (status = any (array['pending','claimed','complete','failed'])),
  constraint block_annotations_attempt_nonneg check (attempt_count >= 0)
);

create index idx_block_annotations_run_status on public.block_annotations using btree (run_id, status);
create index idx_block_annotations_run_block_uid_pending on public.block_annotations using btree (run_id, block_uid) where status = 'pending';

-- Helper RPC: create a run and populate per-block rows in a single transaction.
create or replace function public.create_annotation_run(
  p_owner_id uuid,
  p_doc_uid text,
  p_schema_id uuid
)
returns table(run_id uuid, total_blocks integer)
language plpgsql
as $function$
declare
  v_run_id uuid;
  v_total integer;
begin
  if not exists (
    select 1
    from public.documents d
    where d.doc_uid = p_doc_uid and d.owner_id = p_owner_id and d.status = 'ingested'
  ) then
    raise exception 'Document not found or not ingested';
  end if;

  if not exists (
    select 1
    from public.schemas s
    where s.schema_id = p_schema_id and s.owner_id = p_owner_id
  ) then
    raise exception 'Schema not found';
  end if;

  select count(*) into v_total
  from public.blocks b
  where b.doc_uid = p_doc_uid;

  insert into public.annotation_runs (owner_id, doc_uid, schema_id, status, total_blocks)
  values (p_owner_id, p_doc_uid, p_schema_id, 'running', v_total)
  returning annotation_runs.run_id into v_run_id;

  insert into public.block_annotations (run_id, block_uid)
  select v_run_id, b.block_uid
  from public.blocks b
  where b.doc_uid = p_doc_uid
  order by b.block_index asc;

  return query select v_run_id, v_total;
end;
$function$;

-- RLS: Phase 2 reads (writes via Edge Functions using service role)
alter table public.schemas enable row level security;
alter table public.annotation_runs enable row level security;
alter table public.block_annotations enable row level security;

create policy schemas_select_own
on public.schemas
as permissive
for select
to authenticated
using (owner_id = auth.uid());

create policy annotation_runs_select_own
on public.annotation_runs
as permissive
for select
to authenticated
using (owner_id = auth.uid());

create policy block_annotations_select_own
on public.block_annotations
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.annotation_runs r
    where r.run_id = public.block_annotations.run_id
      and r.owner_id = auth.uid()
  )
);

