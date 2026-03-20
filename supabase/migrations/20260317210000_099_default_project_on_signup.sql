-- Migration 099: Auto-create "Default Project" on user signup and harden
-- parsing profile ownership/RLS policies.
--
-- Note: this migration combines the original signup/default project behavior with
-- parsing_profiles owner_id + RLS policy setup. Previous duplicate-timestamp
-- migration siblings were collapsed in history.

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- 1. Upsert profile (original behaviour from migration 007)
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'display_name', '')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);

  -- 2. Create a Default Project so the user is never in a project-less state
  INSERT INTO public.user_projects (owner_id, project_name, description)
  VALUES (NEW.id, 'Default Project', 'Auto-created on signup')
  ON CONFLICT (owner_id, project_name) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: create Default Project for any existing users who have none
INSERT INTO public.user_projects (owner_id, project_name, description)
SELECT u.id, 'Default Project', 'Auto-created — backfill'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_projects p WHERE p.owner_id = u.id
)
ON CONFLICT (owner_id, project_name) DO NOTHING;

-- Parsing profile ownership and RLS policy setup (from legacy 099_parsing_profiles_rls.sql)
ALTER TABLE public.parsing_profiles
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- RLS
ALTER TABLE public.parsing_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all profiles (system + user-created).
DROP POLICY IF EXISTS parsing_profiles_select ON public.parsing_profiles;
CREATE POLICY parsing_profiles_select ON public.parsing_profiles
  FOR SELECT USING (true);

-- Users can insert their own profiles.
DROP POLICY IF EXISTS parsing_profiles_insert ON public.parsing_profiles;
CREATE POLICY parsing_profiles_insert ON public.parsing_profiles
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Users can update/delete only their own profiles. System profiles (NULL owner) are immutable.
DROP POLICY IF EXISTS parsing_profiles_update ON public.parsing_profiles;
CREATE POLICY parsing_profiles_update ON public.parsing_profiles
  FOR UPDATE USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS parsing_profiles_delete ON public.parsing_profiles;
CREATE POLICY parsing_profiles_delete ON public.parsing_profiles
  FOR DELETE USING (auth.uid() = owner_id);
