-- Repair compatibility projects created during workspace-scope alignment.
-- The original backfill inserted user_projects rows in a writable CTE and then
-- tried to read them back from public.user_projects in the same statement.
-- PostgreSQL keeps a single statement snapshot for the base table, so the new
-- rows were not visible there and some benchmarks stayed orphaned.

WITH candidate_projects AS (
  SELECT
    b.benchmark_id,
    up.project_id,
    ROW_NUMBER() OVER (
      PARTITION BY b.benchmark_id
      ORDER BY
        CASE
          WHEN up.project_name = b.benchmark_name || ' [' || b.benchmark_slug || ']' THEN 0
          ELSE 1
        END,
        up.created_at DESC,
        up.project_id
    ) AS candidate_rank
  FROM public.agchain_benchmarks b
  JOIN public.user_projects up
    ON up.owner_id = b.owner_user_id
  LEFT JOIN public.agchain_project_memberships pm
    ON pm.project_id = up.project_id
  WHERE b.project_id IS NULL
    AND (
      up.project_name = b.benchmark_name || ' [' || b.benchmark_slug || ']'
      OR (
        up.project_name = b.benchmark_name
        AND pm.project_id IS NULL
      )
    )
),
resolved_projects AS (
  SELECT
    benchmark_id,
    project_id
  FROM candidate_projects
  WHERE candidate_rank = 1
)
UPDATE public.agchain_benchmarks b
SET
  project_id = resolved.project_id,
  updated_at = now()
FROM resolved_projects resolved
WHERE b.benchmark_id = resolved.benchmark_id
  AND b.project_id IS NULL;

INSERT INTO public.agchain_project_memberships (
  project_id,
  organization_id,
  user_id,
  membership_role,
  membership_status
)
SELECT DISTINCT
  up.project_id,
  up.organization_id,
  up.owner_id,
  'project_admin',
  'active'
FROM public.user_projects up
JOIN public.agchain_benchmarks b
  ON b.project_id = up.project_id
WHERE up.organization_id IS NOT NULL
  AND up.owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  membership_role = EXCLUDED.membership_role,
  membership_status = 'active',
  updated_at = now();
