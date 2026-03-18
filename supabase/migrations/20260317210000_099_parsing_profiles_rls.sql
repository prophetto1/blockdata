-- Migration 099: Add owner_id + RLS to parsing_profiles.
--
-- System-seeded profiles (from migrations 075, 076, 098) have owner_id = NULL
-- and are read-only. User-created profiles have owner_id set.

ALTER TABLE public.parsing_profiles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- RLS
ALTER TABLE public.parsing_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all profiles (system + user-created).
CREATE POLICY parsing_profiles_select ON public.parsing_profiles
  FOR SELECT USING (true);

-- Users can insert their own profiles.
CREATE POLICY parsing_profiles_insert ON public.parsing_profiles
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update/delete only their own profiles. System profiles (NULL owner) are immutable.
CREATE POLICY parsing_profiles_update ON public.parsing_profiles
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY parsing_profiles_delete ON public.parsing_profiles
  FOR DELETE USING (auth.uid() = owner_id);
