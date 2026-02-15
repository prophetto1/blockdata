-- Migration 029: Ensure projects.workspace_id is always populated from Workspace B default

CREATE OR REPLACE FUNCTION public.assign_default_workspace_to_project_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  IF NEW.workspace_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_b_v2 (owner_id, workspace_name)
  VALUES (NEW.owner_id, 'Default Workspace')
  ON CONFLICT (owner_id, workspace_name) DO NOTHING;

  SELECT workspace_id INTO v_workspace_id
  FROM public.workspace_b_v2
  WHERE owner_id = NEW.owner_id
    AND workspace_name = 'Default Workspace'
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve default workspace for project owner: %', NEW.owner_id;
  END IF;

  INSERT INTO public.workspace_b_memberships_v2 (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, NEW.owner_id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  NEW.workspace_id := v_workspace_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_default_workspace_to_project_v2 ON public.projects;
CREATE TRIGGER trg_assign_default_workspace_to_project_v2
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_workspace_to_project_v2();
