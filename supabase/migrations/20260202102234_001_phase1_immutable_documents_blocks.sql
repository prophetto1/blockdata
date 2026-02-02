-- Migration: 001_phase1_immutable_documents_blocks
-- Phase 1: immutable ingest substrate (documents + blocks) + RLS read policies + safety cron.

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- updated_at trigger helper (Phase 1)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- documents: one row per upload lifecycle, anchored by source_uid (content-addressed)
create table public.documents (
  source_uid text primary key,
  owner_id uuid not null,
  md_uid text unique,
  doc_uid text unique,
  source_type text not null,
  source_locator text not null,
  md_locator text,
  doc_title text not null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  immutable_schema_ref text not null,
  conversion_job_id uuid,
  status text not null default 'uploaded',
  error text,

  constraint documents_source_uid_hex check (source_uid ~ '^[0-9a-f]{64}$'),
  constraint documents_md_uid_hex check (md_uid is null or md_uid ~ '^[0-9a-f]{64}$'),
  constraint documents_doc_uid_hex check (doc_uid is null or doc_uid ~ '^[0-9a-f]{64}$'),
  constraint documents_doc_uid_requires_md_uid check (doc_uid is null or md_uid is not null),
  constraint documents_md_locator_requires_md_uid check (md_locator is null or md_uid is not null),
  constraint documents_source_type check (source_type = any (array['md','docx','pdf','txt'])),
  constraint documents_status check (status = any (array['uploaded','converting','ingested','conversion_failed','ingest_failed'])),
  constraint documents_converting_requires_job check ((status <> 'converting') or conversion_job_id is not null)
);

create index idx_documents_uploaded_at on public.documents using btree (uploaded_at desc);
create index idx_documents_owner_uploaded_at on public.documents using btree (owner_id, uploaded_at desc);

create trigger set_documents_updated_at
before update on public.documents
for each row
execute function public.set_updated_at();

-- blocks: immutable inventory only
create table public.blocks (
  block_uid text primary key,
  doc_uid text not null,
  block_index integer not null,
  block_type text not null,
  section_path text[] not null default '{}'::text[],
  char_span integer[] not null,
  content_original text not null,

  constraint blocks_doc_uid_fk foreign key (doc_uid) references public.documents(doc_uid) on delete cascade,
  constraint blocks_unique_position unique (doc_uid, block_index),
  constraint blocks_block_uid_hex check (block_uid ~ '^[0-9a-f]{64}$'),
  constraint blocks_block_index_nonneg check (block_index >= 0),
  constraint blocks_char_span_len check (array_length(char_span, 1) = 2),
  constraint blocks_char_span_nonneg check ((char_span[1] >= 0) and (char_span[2] >= 0)),
  constraint blocks_char_span_order check (char_span[1] <= char_span[2])
);

create index idx_blocks_doc_uid on public.blocks using btree (doc_uid);
create index idx_blocks_doc_uid_block_index on public.blocks using btree (doc_uid, block_index);

-- RLS: reads only (writes via Edge Functions using service role)
alter table public.documents enable row level security;
alter table public.blocks enable row level security;

create policy documents_select_own
on public.documents
as permissive
for select
to authenticated
using (owner_id = auth.uid());

create policy blocks_select_own
on public.blocks
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.documents d
    where d.doc_uid = public.blocks.doc_uid
      and d.owner_id = auth.uid()
  )
);

-- Safety net: stale conversion cleanup (pg_cron)
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'stale_conversion_cleanup'
  ) then
    perform cron.schedule(
      'stale_conversion_cleanup',
      '*/1 * * * *',
      $cmd$
      update public.documents
      set status = 'conversion_failed',
          error = coalesce(error, 'conversion timed out (stale)')
      where status = 'converting'
        and uploaded_at < now() - interval '5 minutes';
      $cmd$
    );
  end if;
end $$;

