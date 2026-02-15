-- Migration 033: fix recursive RLS policy on workspace_b_memberships_v2
-- Root cause: workspace_b_memberships_v2 SELECT policy self-referenced table
-- under RLS, which can trigger infinite recursion for authenticated queries.

CREATE OR REPLACE FUNCTION public.workspace_b_is_active_member_v2(
  p_workspace_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_b_memberships_v2 m
    WHERE m.workspace_id = p_workspace_id
      AND m.user_id = p_user_id
      AND m.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.workspace_b_is_active_member_v2(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workspace_b_is_active_member_v2(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS workspace_b_v2_select_member ON public.workspace_b_v2;
CREATE POLICY workspace_b_v2_select_member
  ON public.workspace_b_v2
  FOR SELECT
  TO authenticated
  USING (
    public.workspace_b_is_active_member_v2(workspace_id, auth.uid())
  );

DROP POLICY IF EXISTS workspace_b_memberships_v2_select_member ON public.workspace_b_memberships_v2;
CREATE POLICY workspace_b_memberships_v2_select_member
  ON public.workspace_b_memberships_v2
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.workspace_b_is_active_member_v2(workspace_id, auth.uid())
  );
