-- Replay compatibility bridge for the 069 user_projects rename seam.
-- This temporarily recreates the minimum public.projects contract expected
-- by 073 and 091 without rewriting those historical migration files.

DO $$
BEGIN
  IF to_regclass('public.user_projects') IS NOT NULL
     AND to_regclass('public.projects') IS NULL THEN
    CREATE TABLE public.projects (
      project_id uuid PRIMARY KEY,
      owner_id uuid NOT NULL
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_projects_owner_id
      ON public.projects (owner_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.user_projects') IS NOT NULL
     AND to_regclass('public.projects') IS NOT NULL THEN
    INSERT INTO public.projects (project_id, owner_id)
    SELECT up.project_id, up.owner_id
    FROM public.user_projects up
    ON CONFLICT (project_id) DO NOTHING;
  END IF;
END;
$$;
