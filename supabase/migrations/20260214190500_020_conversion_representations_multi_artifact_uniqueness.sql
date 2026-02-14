-- Migration 020: allow multiple representation artifacts per conv_uid
--
-- Prior schema enforced UNIQUE(conv_uid), which allowed only one representation
-- record for a conversion. This migration changes uniqueness to
-- UNIQUE(conv_uid, representation_type) so docling/pandoc/mdast artifacts can
-- coexist under one conversion identity.

ALTER TABLE public.conversion_representations_v2
  DROP CONSTRAINT IF EXISTS conversion_representations_v2_conv_uid_key;

ALTER TABLE public.conversion_representations_v2
  ADD CONSTRAINT conversion_representations_v2_conv_uid_representation_type_key
  UNIQUE (conv_uid, representation_type);

CREATE INDEX IF NOT EXISTS idx_conversion_representations_v2_conv_uid
  ON public.conversion_representations_v2(conv_uid);
