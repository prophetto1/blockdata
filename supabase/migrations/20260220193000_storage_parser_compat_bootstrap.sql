-- Replay remediation bootstrap for parser-era storage tables.
-- This migration restores the bootstrap-safe schema seam required by later
-- parser/storage migrations without rewriting historical migration files.

create table if not exists public.source_documents (
  source_uid text not null,
  owner_id uuid not null,
  source_type text not null,
  source_filesize integer,
  source_total_characters integer,
  source_locator text not null,
  doc_title text not null,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'uploaded',
  error text,
  conversion_job_id uuid,
  project_id uuid not null,
  constraint source_documents_pkey primary key (source_uid),
  constraint source_documents_source_uid_check
    check (source_uid ~ '^[0-9a-f]{64}$')
);

create table if not exists public.conversion_parsing (
  conv_uid text not null,
  source_uid text not null,
  conv_status text,
  conv_parsing_tool text,
  conv_representation_type text,
  conv_total_blocks integer,
  conv_block_type_freq jsonb,
  conv_total_characters integer,
  conv_locator text,
  pipeline_config jsonb default '{}'::jsonb,
  requested_pipeline_config jsonb not null default '{}'::jsonb,
  applied_pipeline_config jsonb not null default '{}'::jsonb,
  parser_runtime_meta jsonb not null default '{}'::jsonb,
  constraint conversion_parsing_pkey primary key (conv_uid),
  constraint conversion_parsing_conv_uid_check
    check (conv_uid ~ '^[0-9a-f]{64}$')
);

create table if not exists public.conversion_representations (
  representation_id uuid not null default gen_random_uuid(),
  source_uid text not null,
  conv_uid text not null,
  parsing_tool text not null,
  representation_type text not null,
  artifact_locator text not null,
  artifact_hash text not null,
  artifact_size_bytes integer not null,
  artifact_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint conversion_representations_pkey primary key (representation_id),
  constraint conversion_representations_conv_uid_rep_type_key
    unique (conv_uid, representation_type),
  constraint conversion_representations_artifact_hash_check
    check (artifact_hash ~ '^[0-9a-f]{64}$'),
  constraint conversion_representations_artifact_size_bytes_check
    check (artifact_size_bytes >= 0),
  constraint conversion_representations_conv_uid_check
    check (conv_uid ~ '^[0-9a-f]{64}$')
);

create table if not exists public.runs (
  run_id uuid not null default gen_random_uuid(),
  owner_id uuid not null,
  conv_uid text not null,
  schema_id uuid not null,
  model_config jsonb,
  status text not null default 'running',
  total_blocks integer not null,
  completed_blocks integer not null default 0,
  failed_blocks integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_log jsonb default '[]'::jsonb,
  constraint runs_pkey primary key (run_id),
  constraint runs_completed_blocks_check check (completed_blocks >= 0),
  constraint runs_failed_blocks_check check (failed_blocks >= 0),
  constraint runs_total_blocks_check check (total_blocks >= 0)
);

create table if not exists public.block_overlays (
  run_id uuid not null,
  block_uid text not null,
  overlay_jsonb_confirmed jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  claimed_by text,
  claimed_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  overlay_jsonb_staging jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  confirmed_by uuid,
  constraint block_overlays_pkey primary key (run_id, block_uid),
  constraint block_overlays_attempt_count_check check (attempt_count >= 0)
);

create table if not exists public.representation_type_catalog (
  representation_type text not null,
  description text,
  sort_order integer not null default 0,
  constraint representation_type_catalog_pkey primary key (representation_type)
);

create table if not exists public.block_type_catalog (
  block_type text not null,
  description text,
  sort_order integer not null default 0,
  constraint block_type_catalog_pkey primary key (block_type)
);

create table if not exists public.status_document_uploads (
  status text not null,
  description text,
  sort_order integer not null default 0,
  constraint status_document_uploads_pkey primary key (status)
);

insert into public.block_type_catalog (block_type, description, sort_order)
values
  ('heading', null, 1),
  ('paragraph', null, 2),
  ('list_item', null, 3),
  ('code_block', null, 4),
  ('table', null, 5),
  ('figure', null, 6),
  ('caption', null, 7),
  ('footnote', null, 8),
  ('divider', null, 9),
  ('html_block', null, 10),
  ('definition', null, 11),
  ('checkbox', null, 12),
  ('form_region', null, 13),
  ('key_value_region', null, 14),
  ('page_header', null, 15),
  ('page_footer', null, 16),
  ('other', null, 17)
on conflict (block_type) do nothing;

insert into public.status_document_uploads (status, description, sort_order)
values
  ('uploaded', null, 1),
  ('upload_failed', null, 2),
  ('ingested', null, 3),
  ('ingest_failed', null, 5)
on conflict (status) do nothing;

alter table public.blocks
  add column if not exists conv_uid text,
  add column if not exists block_locator jsonb,
  add column if not exists block_content text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blocks_conv_uid_block_index_key'
      and conrelid = 'public.blocks'::regclass
  ) then
    alter table only public.blocks
      add constraint blocks_conv_uid_block_index_key
      unique (conv_uid, block_index);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversion_parsing_source_uid_fkey'
      and conrelid = 'public.conversion_parsing'::regclass
  ) then
    alter table only public.conversion_parsing
      add constraint conversion_parsing_source_uid_fkey
      foreign key (source_uid) references public.source_documents(source_uid);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversion_representations_source_uid_fkey'
      and conrelid = 'public.conversion_representations'::regclass
  ) then
    alter table only public.conversion_representations
      add constraint conversion_representations_source_uid_fkey
      foreign key (source_uid) references public.source_documents(source_uid);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'runs_conv_uid_fkey'
      and conrelid = 'public.runs'::regclass
  ) then
    alter table only public.runs
      add constraint runs_conv_uid_fkey
      foreign key (conv_uid) references public.conversion_parsing(conv_uid);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blocks_conv_uid_fkey'
      and conrelid = 'public.blocks'::regclass
  ) then
    alter table only public.blocks
      add constraint blocks_conv_uid_fkey
      foreign key (conv_uid) references public.conversion_parsing(conv_uid);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'block_overlays_block_uid_fkey'
      and conrelid = 'public.block_overlays'::regclass
  ) then
    alter table only public.block_overlays
      add constraint block_overlays_block_uid_fkey
      foreign key (block_uid) references public.blocks(block_uid);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'block_overlays_run_id_fkey'
      and conrelid = 'public.block_overlays'::regclass
  ) then
    alter table only public.block_overlays
      add constraint block_overlays_run_id_fkey
      foreign key (run_id) references public.runs(run_id);
  end if;
end
$$;

create index if not exists idx_block_overlays_run_status
  on public.block_overlays using btree (run_id, status);

create index if not exists idx_blocks_conv_uid
  on public.blocks using btree (conv_uid);

create index if not exists idx_blocks_conv_uid_index
  on public.blocks using btree (conv_uid, block_index);

create index if not exists idx_conversion_representations_conv_uid
  on public.conversion_representations using btree (conv_uid);

create index if not exists idx_conversion_representations_source_created
  on public.conversion_representations using btree (source_uid, created_at desc);

create index if not exists idx_runs_conv_uid
  on public.runs using btree (conv_uid);

create index if not exists idx_runs_owner_started
  on public.runs using btree (owner_id, started_at desc);

alter table public.source_documents enable row level security;
alter table public.conversion_parsing enable row level security;
alter table public.conversion_representations enable row level security;
alter table public.runs enable row level security;
alter table public.block_overlays enable row level security;
alter table public.blocks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'source_documents'
      and policyname = 'source_documents_select_own'
  ) then
    create policy source_documents_select_own
      on public.source_documents
      for select
      using (owner_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversion_parsing'
      and policyname = 'conversion_parsing_select_own'
  ) then
    create policy conversion_parsing_select_own
      on public.conversion_parsing
      for select
      using (
        source_uid in (
          select sd.source_uid
          from public.source_documents sd
          where sd.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conversion_representations'
      and policyname = 'conversion_representations_select_own'
  ) then
    create policy conversion_representations_select_own
      on public.conversion_representations
      for select
      using (
        exists (
          select 1
          from public.source_documents sd
          where sd.source_uid = conversion_representations.source_uid
            and sd.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'runs'
      and policyname = 'runs_select_own'
  ) then
    create policy runs_select_own
      on public.runs
      for select
      using (owner_id = auth.uid());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'block_overlays'
      and policyname = 'block_overlays_select_own'
  ) then
    create policy block_overlays_select_own
      on public.block_overlays
      for select
      using (
        exists (
          select 1
          from public.runs r
          where r.run_id = block_overlays.run_id
            and r.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'block_overlays'
      and policyname = 'block_overlays_update_own'
  ) then
    create policy block_overlays_update_own
      on public.block_overlays
      for update
      using (
        exists (
          select 1
          from public.runs r
          where r.run_id = block_overlays.run_id
            and r.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

drop policy if exists blocks_select_own on public.blocks;

create policy blocks_select_own
  on public.blocks
  for select
  using (
    exists (
      select 1
      from public.conversion_parsing cp
      join public.source_documents sd on sd.source_uid = cp.source_uid
      where cp.conv_uid = blocks.conv_uid
        and sd.owner_id = auth.uid()
    )
  );

grant update (overlay_jsonb_staging) on table public.block_overlays to authenticated;
