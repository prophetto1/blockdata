-- Migration 031: server-driven projects overview (search/filter/pagination + aggregates)

CREATE OR REPLACE FUNCTION public.list_projects_overview_v2(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  project_id UUID,
  owner_id UUID,
  workspace_id UUID,
  project_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  doc_count BIGINT,
  processing_count BIGINT,
  last_activity_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_search TEXT := NULLIF(BTRIM(p_search), '');
  v_status TEXT := COALESCE(NULLIF(BTRIM(p_status), ''), 'all');
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 24), 1), 100);
  v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF v_status NOT IN ('all', 'active', 'processing', 'empty') THEN
    RAISE EXCEPTION 'Invalid p_status: %', v_status;
  END IF;

  RETURN QUERY
  WITH scoped_projects AS (
    SELECT
      p.project_id,
      p.owner_id,
      p.workspace_id,
      p.project_name,
      p.description,
      p.created_at,
      p.updated_at
    FROM public.projects p
    WHERE p.owner_id = auth.uid()
      AND (
        v_search IS NULL
        OR p.project_name ILIKE '%' || v_search || '%'
        OR COALESCE(p.description, '') ILIKE '%' || v_search || '%'
      )
  ),
  aggregated AS (
    SELECT
      p.project_id,
      p.owner_id,
      p.workspace_id,
      p.project_name,
      p.description,
      p.created_at,
      p.updated_at,
      COUNT(d.source_uid)::BIGINT AS doc_count,
      COUNT(*) FILTER (
        WHERE d.status IN ('uploaded', 'converting')
      )::BIGINT AS processing_count,
      COALESCE(
        MAX(d.uploaded_at),
        p.updated_at
      ) AS last_activity_at
    FROM scoped_projects p
    LEFT JOIN public.documents_v2 d
      ON d.project_id = p.project_id
    GROUP BY
      p.project_id,
      p.owner_id,
      p.workspace_id,
      p.project_name,
      p.description,
      p.created_at,
      p.updated_at
  ),
  filtered AS (
    SELECT *
    FROM aggregated a
    WHERE
      (v_status = 'all')
      OR (v_status = 'active' AND a.doc_count > 0)
      OR (v_status = 'processing' AND a.processing_count > 0)
      OR (v_status = 'empty' AND a.doc_count = 0)
  ),
  counted AS (
    SELECT COUNT(*)::BIGINT AS total_count
    FROM filtered
  )
  SELECT
    f.project_id,
    f.owner_id,
    f.workspace_id,
    f.project_name,
    f.description,
    f.created_at,
    f.updated_at,
    f.doc_count,
    f.processing_count,
    f.last_activity_at,
    c.total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY f.updated_at DESC, f.project_id
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_projects_overview_v2(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_projects_overview_v2(TEXT, TEXT, INTEGER, INTEGER)
  TO authenticated, service_role;
