-- Migration 089: cleanup outbox for cross-system reconciliation.
-- When a Postgres delete/reset succeeds but Arango cleanup fails,
-- or when re-parse Arango cleanup fails, a row is written here
-- so a reconciliation sweep can retry.

CREATE TABLE IF NOT EXISTS public.cleanup_outbox (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_uid TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('delete', 'reset', 'reparse_cleanup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_cleanup_outbox_pending
  ON public.cleanup_outbox (created_at)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.cleanup_outbox IS
  'Retryable outbox for Arango cleanup after Postgres lifecycle operations succeed but Arango fails.';