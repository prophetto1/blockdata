-- Superuser-facing database browser RPC helpers.
-- These functions are intended for Edge Functions running with service_role.

CREATE OR REPLACE FUNCTION public.admin_table_exists(
  p_table_schema text,
  p_table_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_type = 'BASE TABLE'
      AND t.table_schema = p_table_schema
      AND t.table_name = p_table_name
      AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
      AND t.table_schema NOT LIKE 'pg_toast%'
      AND t.table_schema NOT LIKE 'pg_temp_%'
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_list_tables()
RETURNS TABLE (
  table_schema text,
  table_name text,
  column_count integer,
  row_estimate bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    t.table_schema::text,
    t.table_name::text,
    COUNT(c.column_name)::integer AS column_count,
    COALESCE(s.n_live_tup::bigint, 0::bigint) AS row_estimate
  FROM information_schema.tables t
  LEFT JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
   AND c.table_name = t.table_name
  LEFT JOIN pg_stat_user_tables s
    ON s.schemaname = t.table_schema
   AND s.relname = t.table_name
  WHERE t.table_type = 'BASE TABLE'
    AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
    AND t.table_schema NOT LIKE 'pg_toast%'
    AND t.table_schema NOT LIKE 'pg_temp_%'
  GROUP BY t.table_schema, t.table_name, s.n_live_tup
  ORDER BY t.table_schema, t.table_name;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_columns(
  p_table_schema text,
  p_table_name text
)
RETURNS TABLE (
  ordinal_position integer,
  column_name text,
  data_type text,
  udt_name text,
  is_nullable boolean,
  column_default text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.admin_table_exists(p_table_schema, p_table_name) THEN
    RAISE EXCEPTION 'Unknown or disallowed table %.%', p_table_schema, p_table_name;
  END IF;

  RETURN QUERY
  SELECT
    c.ordinal_position::integer,
    c.column_name::text,
    c.data_type::text,
    c.udt_name::text,
    (c.is_nullable = 'YES') AS is_nullable,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = p_table_schema
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_fetch_table_rows(
  p_table_schema text,
  p_table_name text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  total_count bigint,
  rows jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
  v_where text := '';
  v_sql text;
BEGIN
  IF NOT public.admin_table_exists(p_table_schema, p_table_name) THEN
    RAISE EXCEPTION 'Unknown or disallowed table %.%', p_table_schema, p_table_name;
  END IF;

  IF v_search IS NOT NULL THEN
    v_where := FORMAT(' WHERE to_jsonb(t)::text ILIKE %L', '%' || v_search || '%');
  END IF;

  v_sql := FORMAT(
    $fmt$
      WITH filtered AS (
        SELECT t.*
        FROM %I.%I t
        %s
      ),
      paged AS (
        SELECT *
        FROM filtered
        ORDER BY ctid
        LIMIT %s
        OFFSET %s
      )
      SELECT
        COALESCE((SELECT COUNT(*)::bigint FROM filtered), 0::bigint) AS total_count,
        COALESCE((SELECT jsonb_agg(to_jsonb(paged.*)) FROM paged), '[]'::jsonb) AS rows
    $fmt$,
    p_table_schema,
    p_table_name,
    v_where,
    v_limit,
    v_offset
  );

  RETURN QUERY EXECUTE v_sql;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_table_exists(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_tables() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_columns(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_fetch_table_rows(text, text, integer, integer, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_table_exists(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_columns(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_fetch_table_rows(text, text, integer, integer, text) TO service_role;
