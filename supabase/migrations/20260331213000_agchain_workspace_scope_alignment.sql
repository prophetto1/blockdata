-- Align AGChain workspace scope onto organizations + explicit project memberships
-- without introducing a second project store.

CREATE TABLE IF NOT EXISTS public.agchain_organizations (
  organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agchain_organization_members (
  organization_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.agchain_organizations(organization_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  membership_role TEXT NOT NULL CHECK (
    membership_role IN ('organization_admin', 'organization_member')
  ),
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (
    membership_status IN ('active', 'disabled')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_organization_members_unique_org_user UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.agchain_project_memberships (
  project_membership_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.user_projects(project_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.agchain_organizations(organization_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  membership_role TEXT NOT NULL CHECK (
    membership_role IN ('project_admin', 'project_editor', 'project_viewer')
  ),
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (
    membership_status IN ('active', 'disabled')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agchain_project_memberships_unique_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS agchain_organization_members_org_user_idx
  ON public.agchain_organization_members (organization_id, user_id);

CREATE INDEX IF NOT EXISTS agchain_project_memberships_project_user_idx
  ON public.agchain_project_memberships (project_id, user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_organizations_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_organizations_updated_at
    BEFORE UPDATE ON public.agchain_organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_organization_members_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_organization_members_updated_at
    BEFORE UPDATE ON public.agchain_organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_agchain_project_memberships_updated_at'
  ) THEN
    CREATE TRIGGER set_agchain_project_memberships_updated_at
    BEFORE UPDATE ON public.agchain_project_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.user_projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.agchain_organizations(organization_id),
  ADD COLUMN IF NOT EXISTS project_slug TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

CREATE INDEX IF NOT EXISTS user_projects_organization_updated_idx
  ON public.user_projects (organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS user_projects_owner_updated_idx
  ON public.user_projects (owner_id, updated_at DESC);

ALTER TABLE public.agchain_benchmarks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.user_projects(project_id);

CREATE INDEX IF NOT EXISTS agchain_benchmarks_project_updated_idx
  ON public.agchain_benchmarks (project_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.create_agchain_project_atomic(
  p_user_id UUID,
  p_organization_id UUID,
  p_project_name TEXT,
  p_project_slug TEXT,
  p_description TEXT,
  p_seed_initial_benchmark BOOLEAN DEFAULT true,
  p_initial_benchmark_name TEXT DEFAULT NULL,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_benchmark_id UUID;
  v_benchmark_version_id UUID;
  v_benchmark_name TEXT;
  v_benchmark_slug_base TEXT;
  v_benchmark_slug TEXT;
  v_benchmark_suffix INTEGER := 2;
BEGIN
  INSERT INTO public.user_projects (
    owner_id,
    organization_id,
    project_slug,
    project_name,
    description,
    created_by,
    updated_at
  )
  VALUES (
    p_user_id,
    p_organization_id,
    p_project_slug,
    p_project_name,
    p_description,
    p_user_id,
    p_now
  )
  RETURNING project_id INTO v_project_id;

  INSERT INTO public.agchain_project_memberships (
    project_id,
    organization_id,
    user_id,
    membership_role,
    membership_status,
    updated_at
  )
  VALUES (
    v_project_id,
    p_organization_id,
    p_user_id,
    'project_admin',
    'active',
    p_now
  );

  IF COALESCE(p_seed_initial_benchmark, true) THEN
    v_benchmark_name := COALESCE(NULLIF(trim(p_initial_benchmark_name), ''), p_project_name);
    v_benchmark_slug_base := NULLIF(
      trim(BOTH '-' FROM regexp_replace(lower(v_benchmark_name), '[^a-z0-9]+', '-', 'g')),
      ''
    );
    IF v_benchmark_slug_base IS NULL THEN
      v_benchmark_slug_base := 'benchmark';
    END IF;

    v_benchmark_slug := v_benchmark_slug_base;
    WHILE EXISTS (
      SELECT 1
      FROM public.agchain_benchmarks existing
      WHERE existing.benchmark_slug = v_benchmark_slug
    ) LOOP
      v_benchmark_slug := left(
        v_benchmark_slug_base,
        greatest(1, 120 - length('-' || v_benchmark_suffix::text))
      ) || '-' || v_benchmark_suffix::text;
      v_benchmark_suffix := v_benchmark_suffix + 1;
    END LOOP;

    INSERT INTO public.agchain_benchmarks (
      project_id,
      benchmark_slug,
      benchmark_name,
      description,
      owner_user_id,
      updated_at
    )
    VALUES (
      v_project_id,
      v_benchmark_slug,
      v_benchmark_name,
      p_description,
      p_user_id,
      p_now
    )
    RETURNING benchmark_id INTO v_benchmark_id;

    INSERT INTO public.agchain_benchmark_versions (
      benchmark_id,
      version_label,
      version_status,
      plan_family,
      created_by,
      updated_at
    )
    VALUES (
      v_benchmark_id,
      'v0.1.0',
      'draft',
      'custom',
      p_user_id,
      p_now
    )
    RETURNING benchmark_version_id INTO v_benchmark_version_id;

    UPDATE public.agchain_benchmarks
    SET
      current_draft_version_id = v_benchmark_version_id,
      updated_at = p_now
    WHERE benchmark_id = v_benchmark_id;
  END IF;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'project_slug', p_project_slug,
    'primary_benchmark_slug', v_benchmark_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_agchain_project_atomic(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT,
  TIMESTAMPTZ
) TO service_role;

WITH distinct_workspace_users AS (
  SELECT DISTINCT owner_id AS user_id
  FROM public.user_projects
  WHERE owner_id IS NOT NULL
  UNION
  SELECT DISTINCT owner_user_id AS user_id
  FROM public.agchain_benchmarks
  WHERE owner_user_id IS NOT NULL
)
INSERT INTO public.agchain_organizations (
  organization_slug,
  display_name,
  owner_user_id,
  is_personal
)
SELECT
  'personal-' || replace(user_id::text, '-', ''),
  'Personal Workspace',
  user_id,
  true
FROM distinct_workspace_users
ON CONFLICT (organization_slug) DO UPDATE
SET
  owner_user_id = EXCLUDED.owner_user_id,
  is_personal = true,
  updated_at = now();

INSERT INTO public.agchain_organization_members (
  organization_id,
  user_id,
  membership_role,
  membership_status
)
SELECT
  org.organization_id,
  org.owner_user_id,
  'organization_admin',
  'active'
FROM public.agchain_organizations org
WHERE org.owner_user_id IS NOT NULL
ON CONFLICT (organization_id, user_id) DO UPDATE
SET
  membership_role = EXCLUDED.membership_role,
  membership_status = 'active',
  updated_at = now();

UPDATE public.user_projects up
SET
  organization_id = org.organization_id,
  created_by = COALESCE(up.created_by, up.owner_id)
FROM public.agchain_organizations org
WHERE org.owner_user_id = up.owner_id
  AND (up.organization_id IS DISTINCT FROM org.organization_id OR up.created_by IS NULL);

INSERT INTO public.agchain_project_memberships (
  project_id,
  organization_id,
  user_id,
  membership_role,
  membership_status
)
SELECT
  up.project_id,
  up.organization_id,
  up.owner_id,
  'project_admin',
  'active'
FROM public.user_projects up
WHERE up.organization_id IS NOT NULL
  AND up.owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  membership_role = EXCLUDED.membership_role,
  membership_status = 'active',
  updated_at = now();

WITH benchmark_project_targets AS (
  SELECT
    b.benchmark_id,
    b.owner_user_id,
    org.organization_id,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.user_projects existing
        WHERE existing.owner_id = b.owner_user_id
          AND existing.project_name = b.benchmark_name
      )
      THEN b.benchmark_name || ' [' || b.benchmark_slug || ']'
      ELSE b.benchmark_name
    END AS project_name,
    CASE
      WHEN COALESCE(NULLIF(b.description, ''), '') <> ''
      THEN b.description
      ELSE 'Compatibility project created from benchmark backfill'
    END AS project_description
  FROM public.agchain_benchmarks b
  JOIN public.agchain_organizations org
    ON org.owner_user_id = b.owner_user_id
  WHERE b.project_id IS NULL
),
inserted_projects AS (
  INSERT INTO public.user_projects (
    owner_id,
    project_name,
    description,
    organization_id,
    created_by
  )
  SELECT
    target.owner_user_id,
    target.project_name,
    target.project_description,
    target.organization_id,
    target.owner_user_id
  FROM benchmark_project_targets target
  ON CONFLICT (owner_id, project_name) DO UPDATE
  SET
    organization_id = COALESCE(user_projects.organization_id, EXCLUDED.organization_id),
    created_by = COALESCE(user_projects.created_by, EXCLUDED.created_by),
    updated_at = now()
  RETURNING project_id, owner_id, project_name, organization_id
)
UPDATE public.agchain_benchmarks b
SET project_id = up.project_id
FROM benchmark_project_targets target
JOIN public.user_projects up
  ON up.owner_id = target.owner_user_id
 AND up.project_name = target.project_name
WHERE b.benchmark_id = target.benchmark_id
  AND b.project_id IS NULL;

INSERT INTO public.agchain_project_memberships (
  project_id,
  organization_id,
  user_id,
  membership_role,
  membership_status
)
SELECT
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

WITH primary_benchmark_by_project AS (
  SELECT
    b.project_id,
    min(b.benchmark_slug) AS benchmark_slug
  FROM public.agchain_benchmarks b
  WHERE b.project_id IS NOT NULL
  GROUP BY b.project_id
),
project_candidates AS (
  SELECT
    up.project_id,
    up.organization_id,
    up.created_at,
    COALESCE(
      NULLIF(
        trim(BOTH '-' FROM regexp_replace(lower(COALESCE(up.project_name, 'project')), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'project'
    ) AS project_name_slug,
    pb.benchmark_slug
  FROM public.user_projects up
  LEFT JOIN primary_benchmark_by_project pb
    ON pb.project_id = up.project_id
  WHERE up.organization_id IS NOT NULL
),
candidate_with_collision_counts AS (
  SELECT
    candidate.*,
    (
      SELECT count(*)
      FROM project_candidates other
      WHERE other.organization_id = candidate.organization_id
        AND candidate.benchmark_slug IS NOT NULL
        AND (
          other.project_name_slug = candidate.benchmark_slug
          OR other.benchmark_slug = candidate.benchmark_slug
        )
    ) AS benchmark_slug_collision_count
  FROM project_candidates candidate
),
project_slug_bases AS (
  SELECT
    candidate.project_id,
    candidate.organization_id,
    candidate.created_at,
    CASE
      WHEN candidate.benchmark_slug IS NOT NULL
       AND candidate.benchmark_slug_collision_count = 1
      THEN candidate.benchmark_slug
      ELSE candidate.project_name_slug
    END AS base_slug
  FROM candidate_with_collision_counts candidate
),
numbered_project_slugs AS (
  SELECT
    base.project_id,
    base.base_slug,
    row_number() OVER (
      PARTITION BY base.organization_id, base.base_slug
      ORDER BY base.created_at, base.project_id
    ) AS slug_ordinal
  FROM project_slug_bases base
),
ordered_project_slugs AS (
  SELECT
    numbered.project_id,
    CASE
      WHEN numbered.slug_ordinal = 1
      THEN numbered.base_slug
      ELSE left(numbered.base_slug, greatest(1, 120 - length('-' || numbered.slug_ordinal::text)))
        || '-'
        || numbered.slug_ordinal::text
    END AS resolved_slug
  FROM numbered_project_slugs numbered
)
UPDATE public.user_projects up
SET project_slug = ordered.resolved_slug
FROM ordered_project_slugs ordered
WHERE up.project_id = ordered.project_id
  AND (up.project_slug IS DISTINCT FROM ordered.resolved_slug OR up.project_slug IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS user_projects_organization_project_slug_key
  ON public.user_projects (organization_id, project_slug);

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  IF to_regclass('public.agchain_datasets') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_record IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'agchain_datasets'
      AND kcu.column_name = 'project_id'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'projects'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.agchain_datasets DROP CONSTRAINT %I',
      constraint_record.constraint_name
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agchain_datasets_project_id_fkey'
  ) THEN
    ALTER TABLE public.agchain_datasets
      ADD CONSTRAINT agchain_datasets_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES public.user_projects(project_id)
      ON DELETE CASCADE;
  END IF;
END $$;
