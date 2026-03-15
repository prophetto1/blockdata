ALTER TABLE public.block_overlays
  ADD COLUMN overlay_uid UUID DEFAULT gen_random_uuid();

UPDATE public.block_overlays
SET overlay_uid = gen_random_uuid()
WHERE overlay_uid IS NULL;

ALTER TABLE public.block_overlays
  ALTER COLUMN overlay_uid SET NOT NULL;

CREATE UNIQUE INDEX idx_block_overlays_overlay_uid
  ON public.block_overlays (overlay_uid);