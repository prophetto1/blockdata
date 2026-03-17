-- Migration 099: Auto-create "Default Project" on user signup
-- Extends the existing auth.users trigger so every new user starts with a project.

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
  INSERT INTO public.projects (owner_id, project_name, description)
  VALUES (NEW.id, 'Default Project', 'Auto-created on signup')
  ON CONFLICT (owner_id, project_name) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill: create Default Project for any existing users who have none
INSERT INTO public.projects (owner_id, project_name, description)
SELECT u.id, 'Default Project', 'Auto-created — backfill'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p WHERE p.owner_id = u.id
)
ON CONFLICT (owner_id, project_name) DO NOTHING;