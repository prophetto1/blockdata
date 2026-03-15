-- Migration 091: extend cleanup_outbox to support overlay sync failures.
-- The manage-overlays edge function needs to enqueue retry work when
-- Arango overlay sync fails after a Postgres mutation commits.

ALTER TABLE public.cleanup_outbox
  DROP CONSTRAINT cleanup_outbox_action_check;

ALTER TABLE public.cleanup_outbox
  ADD CONSTRAINT cleanup_outbox_action_check
  CHECK (action IN ('delete', 'reset', 'reparse_cleanup', 'overlay_sync'));