BEGIN;

CREATE TABLE IF NOT EXISTS public.agchain_operations (
    operation_id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.user_projects(project_id) on delete cascade,
    operation_type text not null,
    status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancel_requested', 'cancelled')),
    target_kind text,
    target_id text,
    idempotency_key text,
    payload_jsonb jsonb not null default '{}'::jsonb,
    progress_jsonb jsonb not null default '{}'::jsonb,
    last_error_jsonb jsonb,
    result_jsonb jsonb,
    attempt_count integer not null default 0,
    max_attempts integer not null default 3,
    lease_owner text,
    lease_expires_at timestamptz,
    started_at timestamptz,
    heartbeat_at timestamptz,
    completed_at timestamptz,
    cancel_requested_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agchain_operations_project_idempotency_key_idx
    ON public.agchain_operations (project_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS agchain_operations_status_lease_idx
    ON public.agchain_operations (status, lease_expires_at);

CREATE INDEX IF NOT EXISTS agchain_operations_project_created_idx
    ON public.agchain_operations (project_id, created_at DESC);

COMMIT;
