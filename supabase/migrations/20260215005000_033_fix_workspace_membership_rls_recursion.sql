-- Migration 033: fix recursive RLS policy on workspace_b_memberships_v2
-- Root cause: workspace_b_memberships_v2 SELECT policy self-referenced table
-- under RLS, which can trigger infinite recursion for authenticated queries.

CREATE OR REPLACE FUNCTION public.workspace_b_is_active_member_v2(
  p_workspace_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_active BOOLEAN := FALSE;
BEGIN
  IF to_regclass('public.workspace_b_memberships_v2') IS NULL THEN
    RETURN FALSE;
  END IF;

  EXECUTE $sql$
    SELECT EXISTS (
      SELECT 1
      FROM public.workspace_b_memberships_v2 m
      WHERE m.workspace_id = $1
        AND m.user_id = $2
        AND m.status = 'active'
    )
  $sql$
  INTO v_is_active
  USING p_workspace_id, p_user_id;

  RETURN v_is_active;
END;
$$;

REVOKE ALL ON FUNCTION public.workspace_b_is_active_member_v2(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workspace_b_is_active_member_v2(UUID, UUID) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.workspace_b_v2') IS NULL THEN
    RAISE NOTICE 'Skipping workspace_b_v2 policy update; relation is absent.';
  ELSE
    DROP POLICY IF EXISTS workspace_b_v2_select_member ON public.workspace_b_v2;
    CREATE POLICY workspace_b_v2_select_member
      ON public.workspace_b_v2
      FOR SELECT
      TO authenticated
      USING (
        public.workspace_b_is_active_member_v2(workspace_id, auth.uid())
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.workspace_b_memberships_v2') IS NULL THEN
    RAISE NOTICE 'Skipping workspace_b_memberships_v2 policy update; relation is absent.';
  ELSE
    DROP POLICY IF EXISTS workspace_b_memberships_v2_select_member ON public.workspace_b_memberships_v2;
    CREATE POLICY workspace_b_memberships_v2_select_member
      ON public.workspace_b_memberships_v2
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR public.workspace_b_is_active_member_v2(workspace_id, auth.uid())
      );
  END IF;
END;
$$;
