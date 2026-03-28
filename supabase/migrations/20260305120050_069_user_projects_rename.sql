-- Repair missing schema step before flow_* migrations start referencing
-- public.user_projects.
DO $$
BEGIN
  IF to_regclass('public.user_projects') IS NULL
     AND to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects RENAME TO user_projects;
  ELSIF to_regclass('public.user_projects') IS NULL THEN
    RAISE EXCEPTION
      'Expected public.projects or public.user_projects before flow migrations';
  END IF;
END;
$$;
