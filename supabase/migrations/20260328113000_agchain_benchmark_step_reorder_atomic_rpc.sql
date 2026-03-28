-- Atomic benchmark step reorder for draft benchmark versions.

CREATE OR REPLACE FUNCTION public.reorder_agchain_benchmark_steps_atomic(
  p_benchmark_version_id UUID,
  p_ordered_step_ids UUID[],
  p_updated_at TIMESTAMPTZ DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_step_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_step_count
  FROM public.agchain_benchmark_steps
  WHERE benchmark_version_id = p_benchmark_version_id;

  IF COALESCE(array_length(p_ordered_step_ids, 1), 0) <> v_step_count
     OR EXISTS (
       SELECT 1
       FROM (
         SELECT benchmark_step_id
         FROM public.agchain_benchmark_steps
         WHERE benchmark_version_id = p_benchmark_version_id
         EXCEPT
         SELECT step_id
         FROM unnest(p_ordered_step_ids) AS desired(step_id)
       ) AS missing_steps
     )
     OR EXISTS (
       SELECT 1
       FROM (
         SELECT step_id
         FROM unnest(p_ordered_step_ids) AS desired(step_id)
         EXCEPT
         SELECT benchmark_step_id
         FROM public.agchain_benchmark_steps
         WHERE benchmark_version_id = p_benchmark_version_id
       ) AS extra_steps
     ) THEN
    RAISE EXCEPTION 'ordered_step_ids must contain each step exactly once';
  END IF;

  WITH desired AS (
    SELECT step_id AS benchmark_step_id, ordinality::INTEGER AS step_order
    FROM unnest(p_ordered_step_ids) WITH ORDINALITY AS desired(step_id, ordinality)
  )
  UPDATE public.agchain_benchmark_steps AS steps
     SET step_order = desired.step_order,
         updated_at = p_updated_at
    FROM desired
   WHERE steps.benchmark_version_id = p_benchmark_version_id
     AND steps.benchmark_step_id = desired.benchmark_step_id;

  UPDATE public.agchain_benchmark_versions
     SET updated_at = p_updated_at
   WHERE benchmark_version_id = p_benchmark_version_id;

  UPDATE public.agchain_benchmarks AS benchmarks
     SET updated_at = p_updated_at
    FROM public.agchain_benchmark_versions AS versions
   WHERE versions.benchmark_version_id = p_benchmark_version_id
     AND benchmarks.benchmark_id = versions.benchmark_id;

  RETURN jsonb_build_object('step_count', v_step_count);
END;
$$;
