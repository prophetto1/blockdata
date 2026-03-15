# Async Extraction and Parse Runtime Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prove that parse profiles are actually applied by the runtime, then ship structured extraction as an async, queued job flow instead of a synchronous Edge Function.

**Architecture:** Keep parsing as a trigger-plus-callback pipeline, but extend the contract so the system records both the requested profile config and the config the conversion runtime actually applied. Build extraction on the repo's existing async worker pattern: `run-extract` validates inputs and enqueues work, `extract-worker` claims discrete work items, writes `extraction_results` incrementally, and the UI watches progress through Realtime plus a client-driven worker loop.

**Tech Stack:** Supabase Postgres + Edge Functions + Realtime, Docling artifacts in Storage, React + Vitest, Deno tests for Edge Functions, platform-managed Vertex Claude via `callVertexClaude()`.

---

## Scope Guardrails

- MVP extraction provider is platform-managed Vertex only. Do not add per-user extraction provider selection in this plan.
- `run-extract` must return `202 Accepted` with a `job_id`. It must not do the LLM work inline.
- Extraction targets in scope: `document` and `page`. `table_row` remains out of scope.
- Self-invoking Edge Functions are out of scope.
- The external conversion service source is not in this workspace. Before Task 4 starts, record its exact local repo path. If that code cannot be located, stop after Task 3 and mark parse-runtime verification blocked on an external dependency.

## Acceptance Criteria

- A parsed document shows both the requested parse profile and the applied parse runtime details.
- The conversion callback can prove whether the runtime honored or adjusted the requested profile.
- Extraction submission returns immediately with `202` and a durable `job_id`.
- Extraction work is resumable and incremental: page results can appear before the job completes.
- The extract workbench disables execution when platform Vertex readiness is not proven.

## Runtime Dependency Matrix

The plan must define which parse profiles are purely parser and OCR configuration versus which ones require an LLM or VLM runtime. Do not ship profile verification until this matrix is implemented and source-verified in the conversion runtime.

| Profile | Docling pipeline | OCR dependency | LLM or VLM dependency | Required runtime proof |
|---|---|---|---|---|
| `Fast` | `standard` | `tesseract` | None | Conversion service shows `ocr_options.kind = "tesseract"` in `applied_pipeline_config` |
| `Balanced` | `standard` | `easyocr` | None for baseline parsing; if picture classification uses a model, that model must be declared in `parser_runtime_meta` | Conversion service shows `ocr_options.kind = "easyocr"` and any classification model identifier used |
| `High Quality` | `standard` | `easyocr` | Potentially yes if `do_picture_description` or `do_chart_extraction` is enabled | Conversion service must name the exact provider and model used for picture description or chart extraction, or reject the profile as unsupported in the current runtime |
| `AI Vision` | `vlm` | None beyond page image generation | Yes, always | Conversion service must name the exact VLM provider, model, and auth path in `parser_runtime_meta` |
| Structured extraction | Post-parse extraction | None | Yes, always | `extract-readiness` must prove Vertex auth is live before the UI allows execution |

The current seeded profiles in [20260310120000_075_parsing_pipeline_config.sql](e:\writing-system\supabase\migrations\20260310120000_075_parsing_pipeline_config.sql#L1) imply these dependencies, but the runtime contract must stop relying on implication.

## Required Configuration Contract

Before implementation is considered complete, the conversion service must expose a stable runtime contract for parse profiles:

- `requested_pipeline_config`: the exact config received from `trigger-parse`
- `applied_pipeline_config`: the exact config actually used after defaults and normalization
- `parser_runtime_meta.parser`: parser family, such as `docling`
- `parser_runtime_meta.parser_version`: concrete parser version
- `parser_runtime_meta.ocr_backend`: concrete OCR backend, such as `tesseract` or `easyocr`
- `parser_runtime_meta.vlm_provider`: required when a VLM-backed profile is used
- `parser_runtime_meta.vlm_model`: required when a VLM-backed profile is used
- `parser_runtime_meta.enrichment_models`: array of provider or model identifiers used for picture description, chart extraction, or other AI enrichments

If a profile requests an OCR backend, VLM, or enrichment model that is not configured in the runtime, the conversion service must reject the job early with a clear error. It must not silently downgrade to another path.

## Explicit Non-Goals

- Do not pretend all profiles are equivalent configuration presets if some of them require different model backends.
- Do not let the UI present `AI Vision` or other AI-enriched profiles as runnable unless the conversion runtime reports that their dependencies are configured.
- Do not treat extraction-provider readiness as sufficient proof that parse-profile AI dependencies are also configured.

### Task 1: Add Parse Runtime Audit Columns

**Files:**
- Create: `supabase/migrations/20260314213000_088_parse_runtime_audit.sql`

**Step 1: Write the failing migration shape**

Add these changes to the migration:

```sql
ALTER TABLE public.conversion_parsing
  ADD COLUMN IF NOT EXISTS requested_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parser_runtime_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.conversion_parsing
SET
  requested_pipeline_config = CASE
    WHEN requested_pipeline_config = '{}'::jsonb THEN COALESCE(pipeline_config, '{}'::jsonb)
    ELSE requested_pipeline_config
  END,
  applied_pipeline_config = CASE
    WHEN applied_pipeline_config = '{}'::jsonb THEN COALESCE(pipeline_config, '{}'::jsonb)
    ELSE applied_pipeline_config
  END;

CREATE OR REPLACE VIEW public.view_documents AS
SELECT
  sd.source_uid,
  sd.owner_id,
  sd.source_type,
  sd.source_filesize,
  sd.source_total_characters,
  sd.source_locator,
  sd.doc_title,
  sd.uploaded_at,
  sd.updated_at,
  sd.status,
  sd.error,
  sd.conversion_job_id,
  sd.project_id,
  cp.conv_uid,
  cp.conv_status,
  cp.conv_parsing_tool,
  cp.conv_representation_type,
  cp.conv_total_blocks,
  cp.conv_block_type_freq,
  cp.conv_total_characters,
  cp.conv_locator,
  cp.pipeline_config,
  cp.requested_pipeline_config,
  cp.applied_pipeline_config,
  cp.parser_runtime_meta
FROM public.source_documents sd
LEFT JOIN public.conversion_parsing cp ON cp.source_uid = sd.source_uid;
```

**Step 2: Apply the migration locally**

Run: `npx supabase db reset`
Expected: PASS, and `view_documents` now exposes `requested_pipeline_config`, `applied_pipeline_config`, and `parser_runtime_meta`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260314213000_088_parse_runtime_audit.sql
git commit -m "feat: add parse runtime audit columns"
```

---

### Task 2: Make `trigger-parse` Persist the Requested Config

**Files:**
- Create: `supabase/functions/_shared/parse_pipeline_contract.ts`
- Create: `supabase/functions/_shared/parse_pipeline_contract.test.ts`
- Modify: `supabase/functions/trigger-parse/index.ts`

**Step 1: Write the failing helper tests**

Create `supabase/functions/_shared/parse_pipeline_contract.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { buildRequestedPipelineConfig } from "./parse_pipeline_contract.ts";

Deno.test("profile config is decorated with profile metadata", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-1",
    profileConfig: { name: "Balanced", pipeline: "standard" },
    configOverride: null,
  });

  assertEquals(result, {
    name: "Balanced",
    pipeline: "standard",
    _profile_id: "profile-1",
    _profile_name: "Balanced",
  });
});

Deno.test("explicit config override wins over saved profile", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-1",
    profileConfig: { name: "Balanced" },
    configOverride: { pipeline: "vlm" },
  });

  assertEquals(result, { pipeline: "vlm" });
});
```

**Step 2: Run the helper tests to verify they fail**

Run: `deno test supabase/functions/_shared/parse_pipeline_contract.test.ts`
Expected: FAIL because `buildRequestedPipelineConfig` does not exist yet.

**Step 3: Implement the helper and wire `trigger-parse` to it**

Create `supabase/functions/_shared/parse_pipeline_contract.ts`:

```typescript
type BuildRequestedPipelineConfigArgs = {
  profileId: string | null;
  profileConfig: Record<string, unknown> | null;
  configOverride: Record<string, unknown> | null;
};

export function buildRequestedPipelineConfig(
  args: BuildRequestedPipelineConfigArgs,
): Record<string, unknown> {
  if (args.configOverride && Object.keys(args.configOverride).length > 0) {
    return args.configOverride;
  }

  const profileConfig = args.profileConfig ?? {};
  if (!args.profileId) return profileConfig;

  return {
    ...profileConfig,
    _profile_id: args.profileId,
    _profile_name: typeof profileConfig.name === "string" ? profileConfig.name : null,
  };
}
```

Update `supabase/functions/trigger-parse/index.ts` so that:

- it calls `buildRequestedPipelineConfig(...)`
- the pre-insert row writes `requested_pipeline_config`
- the legacy `pipeline_config` column is still populated with the same requested payload for backward compatibility
- the outbound `/convert` request body still sends `pipeline_config`, but that field now explicitly means "requested config"

**Step 4: Run the helper tests again**

Run: `deno test supabase/functions/_shared/parse_pipeline_contract.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/_shared/parse_pipeline_contract.ts supabase/functions/_shared/parse_pipeline_contract.test.ts supabase/functions/trigger-parse/index.ts
git commit -m "feat: persist requested parse pipeline config"
```

---

### Task 3: Make `conversion-complete` Persist Applied Config and Runtime Metadata

**Files:**
- Create: `supabase/functions/conversion-complete/index.test.ts`
- Modify: `supabase/functions/conversion-complete/index.ts`

**Step 1: Write the failing callback tests**

Create `supabase/functions/conversion-complete/index.test.ts` with cases for:

```typescript
Deno.test("writes applied config and parser runtime metadata from callback body", async () => {
  // Arrange a callback payload with:
  // requested pipeline_config
  // applied_pipeline_config
  // parser_runtime_meta
  // success: true
});

Deno.test("falls back to pipeline_config when legacy callback omits applied fields", async () => {
  // Arrange a legacy callback payload that only includes pipeline_config.
  // Expect requested_pipeline_config and applied_pipeline_config to both use it.
});
```

**Step 2: Run the callback tests to verify they fail**

Run: `deno test supabase/functions/conversion-complete/index.test.ts`
Expected: FAIL because the handler does not persist the new fields yet.

**Step 3: Implement the callback contract**

Update `supabase/functions/conversion-complete/index.ts` so that `ConversionCompleteBody` accepts:

```typescript
type ConversionCompleteBody = {
  source_uid: string;
  conversion_job_id: string;
  pipeline_config?: Record<string, unknown> | null;
  applied_pipeline_config?: Record<string, unknown> | null;
  parser_runtime_meta?: Record<string, unknown> | null;
  success: boolean;
  // existing fields...
};
```

When the callback succeeds, upsert these values into `conversion_parsing`:

```typescript
const requestedPipelineConfig = body.pipeline_config ?? {};
const appliedPipelineConfig = body.applied_pipeline_config ?? requestedPipelineConfig;
const parserRuntimeMeta = body.parser_runtime_meta ?? {};
```

Persist:

```typescript
requested_pipeline_config: requestedPipelineConfig,
applied_pipeline_config: appliedPipelineConfig,
parser_runtime_meta: parserRuntimeMeta,
pipeline_config: requestedPipelineConfig,
```

Also require the callback contract to preserve runtime dependency evidence:

```typescript
parser_runtime_meta: {
  parser: "docling",
  parser_version: "...",
  ocr_backend: "easyocr",
  vlm_provider: null,
  vlm_model: null,
  enrichment_models: [],
}
```

**Step 4: Run the callback tests again**

Run: `deno test supabase/functions/conversion-complete/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/conversion-complete/index.ts supabase/functions/conversion-complete/index.test.ts
git commit -m "feat: persist applied parse runtime details"
```

---

### Task 4: Update the External Conversion Service to Honor the Profile

**Files:**
- Modify: `<conversion-service-repo>/app/main.py`
- Modify: `<conversion-service-repo>/app/docling_runner.py`
- Create: `<conversion-service-repo>/tests/test_pipeline_config_contract.py`

**Step 1: Replace `<conversion-service-repo>` with the real local path**

Record the exact path in the branch notes before touching code.

**Step 2: Write the failing runtime contract tests**

Create `<conversion-service-repo>/tests/test_pipeline_config_contract.py`:

```python
def test_requested_profile_is_mapped_to_docling_options():
    requested = {
        "pipeline": "standard",
        "pdf_pipeline": {"do_ocr": True, "table_structure_options": {"mode": "accurate"}},
    }
    applied = build_docling_options(requested)
    assert applied["pipeline"] == "standard"
    assert applied["pdf_pipeline"]["table_structure_options"]["mode"] == "accurate"


def test_callback_payload_includes_applied_config_and_runtime_meta():
    payload = build_conversion_complete_payload(
        requested_config={"pipeline": "vlm"},
        applied_config={"pipeline": "vlm"},
        parser_version="docling-0.19.0",
    )
    assert payload["applied_pipeline_config"]["pipeline"] == "vlm"
    assert payload["parser_runtime_meta"]["parser_version"] == "docling-0.19.0"
```

**Step 3: Run the external tests to verify they fail**

Run: `pytest <conversion-service-repo>/tests/test_pipeline_config_contract.py -q`
Expected: FAIL because the conversion service does not expose the contract yet.

**Step 4: Implement the runtime mapping**

Update `<conversion-service-repo>/app/docling_runner.py` so that:

- incoming `pipeline_config` is validated before conversion starts
- unsupported keys raise a 400-class request error inside the service, not a silent ignore
- the service records the exact options it actually applied after defaults and normalization
- the service resolves profile requirements into an explicit runtime dependency set: OCR backend, optional VLM backend, optional enrichment models
- if the requested profile needs a VLM or enrichment model that is not configured, the service fails before work begins with a clear error message

Update `<conversion-service-repo>/app/main.py` so the callback body includes:

```python
{
    "pipeline_config": requested_config,
    "applied_pipeline_config": applied_config,
    "parser_runtime_meta": {
        "parser": "docling",
        "parser_version": DOCLING_VERSION,
        "ocr_backend": resolved_ocr_backend,
        "vlm_provider": resolved_vlm_provider,
        "vlm_model": resolved_vlm_model,
        "enrichment_models": resolved_enrichment_models,
        "runtime_image": os.getenv("SERVICE_IMAGE", ""),
    },
}
```

**Step 5: Run the external tests again**

Run: `pytest <conversion-service-repo>/tests/test_pipeline_config_contract.py -q`
Expected: PASS

**Step 6: Commit**

```bash
git add <conversion-service-repo>/app/main.py <conversion-service-repo>/app/docling_runner.py <conversion-service-repo>/tests/test_pipeline_config_contract.py
git commit -m "feat: honor parsing profiles in conversion runtime"
```

---

### Task 5: Show Requested vs Applied Parse Runtime in the UI

**Files:**
- Modify: `web/src/lib/types.ts`
- Modify: `web/src/pages/parseArtifacts.ts`
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`
- Create: `web/src/components/documents/ParseConfigColumn.test.tsx`

**Step 1: Write the failing UI test**

Create `web/src/components/documents/ParseConfigColumn.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ParseConfigColumn } from './ParseConfigColumn';

it('shows requested and applied parse runtime details for the selected document', () => {
  render(
    <ParseConfigColumn
      docs={[]}
      selected={new Set()}
      selectedDoc={{
        source_uid: 'doc-1',
        owner_id: 'user-1',
        conv_uid: 'conv-1',
        project_id: 'project-1',
        source_type: 'pdf',
        source_filesize: 12,
        source_total_characters: 100,
        doc_title: 'Contract.pdf',
        status: 'parsed',
        uploaded_at: '2026-03-14T00:00:00Z',
        error: null,
        requested_pipeline_config: { _profile_name: 'Balanced' },
        applied_pipeline_config: { pipeline: 'standard' },
        parser_runtime_meta: { parser_version: 'docling-0.19.0' },
      } as any}
      parseTab={{} as any}
    />
  );

  expect(screen.getByText(/Balanced/)).toBeInTheDocument();
  expect(screen.getByText(/docling-0.19.0/)).toBeInTheDocument();
});
```

**Step 2: Run the UI test to verify it fails**

Run: `npm run test -- src/components/documents/ParseConfigColumn.test.tsx`
Expected: FAIL because the component does not render the new fields yet.

**Step 3: Implement the minimal UI**

Update `web/src/lib/types.ts`:

```typescript
export type DocumentRow = {
  // existing fields...
  requested_pipeline_config?: Record<string, unknown> | null;
  applied_pipeline_config?: Record<string, unknown> | null;
  parser_runtime_meta?: Record<string, unknown> | null;
};
```

Update `web/src/pages/parseArtifacts.ts` so the cache key includes the new fields:

```typescript
requested_pipeline_config: doc.requested_pipeline_config ?? null,
applied_pipeline_config: doc.applied_pipeline_config ?? null,
parser_runtime_meta: doc.parser_runtime_meta ?? null,
```

Update `web/src/components/documents/ParseConfigColumn.tsx` to render two small cards:

- "Requested Profile" from `selectedDoc.requested_pipeline_config`
- "Applied Runtime" from `selectedDoc.applied_pipeline_config` and `selectedDoc.parser_runtime_meta`

**Step 4: Run the UI test again**

Run: `npm run test -- src/components/documents/ParseConfigColumn.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/lib/types.ts web/src/pages/parseArtifacts.ts web/src/components/documents/ParseConfigColumn.tsx web/src/components/documents/ParseConfigColumn.test.tsx
git commit -m "feat: show requested and applied parse runtime details"
```

---

### Task 6: Add an Extraction Runtime Readiness Gate

**Files:**
- Create: `supabase/functions/extract-readiness/index.ts`
- Create: `supabase/functions/extract-readiness/index.test.ts`
- Modify: `supabase/functions/README.md`
- Create: `web/src/hooks/useExtractRuntimeReadiness.ts`
- Create: `web/src/hooks/useExtractRuntimeReadiness.test.ts`
- Modify: `web/src/pages/useExtractWorkbench.tsx`

**Step 1: Write the failing readiness tests**

Create `supabase/functions/extract-readiness/index.test.ts` with these cases:

```typescript
Deno.test("returns not ready when GCP vertex secrets are missing", async () => {
  // mock Deno.env.get to return null for GCP_VERTEX_SA_KEY
});

Deno.test("returns ready when token exchange succeeds", async () => {
  // mock getVertexAccessToken() to return a token
});
```

Create `web/src/hooks/useExtractRuntimeReadiness.test.ts`:

```tsx
it('disables extraction actions when readiness endpoint reports not ready', async () => {
  // mock edgeFetch('extract-readiness') -> { is_ready: false, reasons: ['Missing GCP_VERTEX_SA_KEY'] }
});
```

**Step 2: Run the readiness tests to verify they fail**

Run: `deno test supabase/functions/extract-readiness/index.test.ts`
Expected: FAIL

Run: `npm run test -- src/hooks/useExtractRuntimeReadiness.test.ts`
Expected: FAIL

**Step 3: Implement the readiness endpoint and hook**

Create `supabase/functions/extract-readiness/index.ts`:

```typescript
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { getVertexAccessToken } from "../_shared/vertex_auth.ts";
import { requireUserId } from "../_shared/supabase.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;
  await requireUserId(req);

  const reasons: string[] = [];
  if (!Deno.env.get("GCP_VERTEX_SA_KEY")) reasons.push("Missing GCP_VERTEX_SA_KEY");
  if (!Deno.env.get("GCP_VERTEX_PROJECT_ID")) reasons.push("Missing GCP_VERTEX_PROJECT_ID");

  if (reasons.length > 0) return json(200, { is_ready: false, reasons });

  try {
    await getVertexAccessToken();
    return json(200, { is_ready: true, reasons: [] });
  } catch (error) {
    return json(200, {
      is_ready: false,
      reasons: [error instanceof Error ? error.message : String(error)],
    });
  }
});
```

Create `web/src/hooks/useExtractRuntimeReadiness.ts` and call it from `web/src/pages/useExtractWorkbench.tsx` so the workbench:

- loads readiness once on mount
- shows a blocking banner when `is_ready === false`
- disables "Run Extraction" until readiness passes

This readiness check only covers structured extraction on Vertex. It is not sufficient for parse-profile readiness.

**Step 4: Run the tests again**

Run: `deno test supabase/functions/extract-readiness/index.test.ts`
Expected: PASS

Run: `npm run test -- src/hooks/useExtractRuntimeReadiness.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/extract-readiness/index.ts supabase/functions/extract-readiness/index.test.ts supabase/functions/README.md web/src/hooks/useExtractRuntimeReadiness.ts web/src/hooks/useExtractRuntimeReadiness.test.ts web/src/pages/useExtractWorkbench.tsx
git commit -m "feat: gate extraction on platform vertex readiness"
```

---

### Task 6A: Add Parse Profile Runtime Readiness Checks

**Files:**
- Create: `supabase/functions/parse-profile-readiness/index.ts`
- Create: `supabase/functions/parse-profile-readiness/index.test.ts`
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`
- Create: `web/src/components/documents/ParseConfigColumn.test.tsx`

**Step 1: Write the failing readiness tests**

Create `supabase/functions/parse-profile-readiness/index.test.ts` with cases for:

```typescript
Deno.test("AI Vision is not ready when no VLM runtime is configured", async () => {
  // mock missing VLM config
});

Deno.test("High Quality is not ready when picture description is enabled but no enrichment model is configured", async () => {
  // mock missing enrichment model
});

Deno.test("Fast is ready when tesseract is configured", async () => {
  // mock OCR backend availability
});
```

**Step 2: Run the readiness tests to verify they fail**

Run: `deno test supabase/functions/parse-profile-readiness/index.test.ts`
Expected: FAIL

**Step 3: Implement the readiness endpoint**

Create `supabase/functions/parse-profile-readiness/index.ts` so it returns, per profile:

```json
{
  "profiles": [
    {
      "profile_name": "Fast",
      "is_ready": true,
      "requirements": {
        "ocr_backend": "tesseract",
        "vlm_model": null,
        "enrichment_models": []
      },
      "reasons": []
    }
  ]
}
```

The endpoint must distinguish:

- OCR backend readiness
- VLM runtime readiness
- enrichment-model readiness

**Step 4: Surface readiness in the Parse UI**

Update `web/src/components/documents/ParseConfigColumn.tsx` so profiles that are not ready:

- show an explicit warning
- cannot be dispatched
- explain which dependency is missing

**Step 5: Run the tests again**

Run: `deno test supabase/functions/parse-profile-readiness/index.test.ts`
Expected: PASS

Run: `npm run test -- src/components/documents/ParseConfigColumn.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add supabase/functions/parse-profile-readiness/index.ts supabase/functions/parse-profile-readiness/index.test.ts web/src/components/documents/ParseConfigColumn.tsx web/src/components/documents/ParseConfigColumn.test.tsx
git commit -m "feat: gate parse profiles on runtime readiness"
```

---

### Task 7: Create the Async Extraction Queue Schema

**Files:**
- Create: `supabase/migrations/20260314220000_089_async_extraction_jobs.sql`

**Step 1: Write the migration**

Add these objects:

```sql
CREATE TABLE IF NOT EXISTS public.extraction_schemas (
  schema_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  project_id uuid REFERENCES public.projects(project_id),
  schema_name text NOT NULL,
  schema_body jsonb NOT NULL,
  extraction_target text NOT NULL CHECK (extraction_target IN ('document', 'page')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extraction_jobs (
  job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  source_uid text NOT NULL REFERENCES public.source_documents(source_uid),
  schema_id uuid NOT NULL REFERENCES public.extraction_schemas(schema_id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'complete', 'failed', 'cancelled')),
  llm_provider text NOT NULL DEFAULT 'vertex_ai',
  llm_model text NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
  config_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items integer NOT NULL DEFAULT 0,
  completed_items integer NOT NULL DEFAULT 0,
  failed_items integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.extraction_job_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.extraction_jobs(job_id) ON DELETE CASCADE,
  target_kind text NOT NULL CHECK (target_kind IN ('document', 'page')),
  page_number integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'complete', 'failed')),
  claimed_by text,
  claimed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text
);

CREATE TABLE IF NOT EXISTS public.extraction_results (
  result_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL UNIQUE REFERENCES public.extraction_job_items(item_id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.extraction_jobs(job_id) ON DELETE CASCADE,
  page_number integer,
  extracted_data jsonb NOT NULL,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.claim_extraction_items(
  p_owner_id uuid,
  p_job_id uuid,
  p_worker_id text,
  p_limit integer DEFAULT 1
)
RETURNS SETOF public.extraction_job_items
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT item_id
    FROM public.extraction_job_items
    WHERE job_id = p_job_id
      AND status = 'pending'
    ORDER BY page_number NULLS FIRST, item_id
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.extraction_job_items i
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = now(),
    attempt_count = i.attempt_count + 1
  FROM candidate
  JOIN public.extraction_jobs j ON j.job_id = i.job_id
  WHERE i.item_id = candidate.item_id
    AND j.owner_id = p_owner_id
  RETURNING i.*;
END;
$$;
```

Also add RLS policies, indexes, `updated_at` trigger for `extraction_schemas`, and guarded Realtime publication for `extraction_jobs`, `extraction_job_items`, and `extraction_results`.

**Step 2: Apply the migration**

Run: `npx supabase db reset`
Expected: PASS, with all extraction tables and `claim_extraction_items` present.

**Step 3: Commit**

```bash
git add supabase/migrations/20260314220000_089_async_extraction_jobs.sql
git commit -m "feat: add async extraction queue schema"
```

---

### Task 8: Build the `run-extract` Submitter and Docling Text Helper

**Files:**
- Create: `supabase/functions/_shared/docling_page_text.ts`
- Create: `supabase/functions/_shared/docling_page_text.test.ts`
- Create: `supabase/functions/run-extract/index.ts`
- Create: `supabase/functions/run-extract/index.test.ts`

**Step 1: Write the failing helper tests**

Create `supabase/functions/_shared/docling_page_text.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { buildExtractionItems } from "./docling_page_text.ts";

Deno.test("document mode creates one work item", () => {
  const items = buildExtractionItems({ totalPages: 4, extractionTarget: "document" });
  assertEquals(items, [{ target_kind: "document", page_number: null }]);
});

Deno.test("page mode creates one item per requested page", () => {
  const items = buildExtractionItems({
    totalPages: 4,
    extractionTarget: "page",
    pageRange: { start: 2, end: 3 },
  });
  assertEquals(items, [
    { target_kind: "page", page_number: 2 },
    { target_kind: "page", page_number: 3 },
  ]);
});
```

Create `supabase/functions/run-extract/index.test.ts` with cases for:

- `400` on invalid page ranges
- `409` when the source document is not `parsed`
- `202` with `job_id` when validation succeeds
- inserted `extraction_jobs` plus `extraction_job_items`

**Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/_shared/docling_page_text.test.ts supabase/functions/run-extract/index.test.ts`
Expected: FAIL

**Step 3: Implement the helper and the submitter**

Create `supabase/functions/_shared/docling_page_text.ts` with:

```typescript
export function buildExtractionItems(args: {
  totalPages: number;
  extractionTarget: "document" | "page";
  pageRange?: { start: number; end: number } | null;
}) {
  if (args.extractionTarget === "document") {
    return [{ target_kind: "document", page_number: null }];
  }

  const start = args.pageRange?.start ?? 1;
  const end = args.pageRange?.end ?? args.totalPages;
  const items: Array<{ target_kind: "page"; page_number: number }> = [];
  for (let page = start; page <= end; page += 1) {
    items.push({ target_kind: "page", page_number: page });
  }
  return items;
}
```

Create `supabase/functions/run-extract/index.ts` so it:

- authenticates the user
- validates `source_uid`, `schema_id`, extraction target, and page range
- loads the parsed Docling artifact only far enough to determine total pages
- inserts one `extraction_jobs` row with `status = 'queued'`
- inserts the derived `extraction_job_items`
- returns `202` with:

```json
{
  "job_id": "<uuid>",
  "status": "queued"
}
```

**Step 4: Run the tests again**

Run: `deno test supabase/functions/_shared/docling_page_text.test.ts supabase/functions/run-extract/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/_shared/docling_page_text.ts supabase/functions/_shared/docling_page_text.test.ts supabase/functions/run-extract/index.ts supabase/functions/run-extract/index.test.ts
git commit -m "feat: add extraction job submitter"
```

---

### Task 9: Build the Client-Driven `extract-worker`

**Files:**
- Create: `supabase/functions/_shared/extraction_prompt.ts`
- Create: `supabase/functions/_shared/extraction_prompt.test.ts`
- Create: `supabase/functions/extract-worker/index.ts`
- Create: `supabase/functions/extract-worker/index.test.ts`

**Step 1: Write the failing worker tests**

Create `supabase/functions/_shared/extraction_prompt.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { buildExtractionTool } from "./extraction_prompt.ts";

Deno.test("schema becomes tool input_schema", () => {
  const tool = buildExtractionTool({
    schemaBody: { type: "object", properties: { title: { type: "string" } }, required: ["title"] },
  });

  assertEquals(tool.input_schema.required, ["title"]);
});
```

Create `supabase/functions/extract-worker/index.test.ts` with cases for:

- claim one pending item
- mark the parent job `running`
- write one `extraction_results` row
- mark the item `complete`
- mark the job `complete` when no pending items remain

**Step 2: Run the tests to verify they fail**

Run: `deno test supabase/functions/_shared/extraction_prompt.test.ts supabase/functions/extract-worker/index.test.ts`
Expected: FAIL

**Step 3: Implement the prompt helper and worker**

Create `supabase/functions/_shared/extraction_prompt.ts`:

```typescript
export function buildExtractionTool(args: { schemaBody: Record<string, unknown> }) {
  return {
    name: "submit_extraction",
    description: "Return structured extraction data for the requested content.",
    input_schema: args.schemaBody,
  };
}
```

Create `supabase/functions/extract-worker/index.ts` so it:

- requires an authenticated user
- accepts `{ job_id }`
- claims one or more `extraction_job_items` using `claim_extraction_items`
- marks the job `running` if it was `queued`
- loads the Docling JSON artifact and assembles either document text or page text
- calls `callVertexClaude()` with `tool_choice: { type: "tool", name: "submit_extraction" }`
- upserts `extraction_results`
- marks items `complete` or `failed`
- recomputes job counters and sets job status to `complete` only when no `pending` or `claimed` items remain

Do not recurse and do not self-invoke another Edge Function.

**Step 4: Run the tests again**

Run: `deno test supabase/functions/_shared/extraction_prompt.test.ts supabase/functions/extract-worker/index.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add supabase/functions/_shared/extraction_prompt.ts supabase/functions/_shared/extraction_prompt.test.ts supabase/functions/extract-worker/index.ts supabase/functions/extract-worker/index.test.ts
git commit -m "feat: add client-driven extraction worker"
```

---

### Task 10: Wire the Extract Workbench to Jobs, Results, and Realtime

**Files:**
- Create: `web/src/hooks/useExtractionJobRunner.ts`
- Create: `web/src/hooks/useExtractionJobRunner.test.ts`
- Modify: `web/src/pages/useExtractWorkbench.tsx`
- Modify: `web/src/components/documents/ExtractCompactFileList.tsx`
- Modify: `web/src/pages/useExtractWorkbench.test.ts`

**Step 1: Write the failing workbench tests**

Add these cases to `web/src/pages/useExtractWorkbench.test.ts`:

```tsx
it('submits extraction and stores the returned job id', async () => {
  // mock edgeFetch('run-extract') -> { job_id: 'job-1', status: 'queued' }
});

it('starts a client-driven worker loop while the job is queued or running', async () => {
  // mock edgeFetch('extract-worker') until all items are complete
});

it('renders incremental page results before job completion', async () => {
  // mock realtime rows for extraction_results while extraction_jobs.status remains running
});
```

**Step 2: Run the workbench tests to verify they fail**

Run: `npm run test -- src/pages/useExtractWorkbench.test.ts`
Expected: FAIL

**Step 3: Implement the hook and UI wiring**

Create `web/src/hooks/useExtractionJobRunner.ts` so it:

- calls `run-extract`
- saves `job_id` in local state
- starts a loop that calls `extract-worker` while the active job status is `queued` or `running`
- stops when the job reaches `complete`, `failed`, or `cancelled`

Pseudo-code:

```typescript
while (!cancelled && (job.status === 'queued' || job.status === 'running')) {
  await edgeFetch('extract-worker', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: job.job_id }),
  });
  await wait(500);
}
```

Update `web/src/pages/useExtractWorkbench.tsx` so it:

- loads `extraction_jobs` and `extraction_results` for the selected document
- subscribes to both tables via Supabase Realtime
- renders a visible job status badge
- shows partial page results as soon as they arrive
- disables "Run Extraction" when readiness is false or no schema is selected

Update `web/src/components/documents/ExtractCompactFileList.tsx` to show whether a selected file has an active extraction job.

**Step 4: Run the workbench tests again**

Run: `npm run test -- src/pages/useExtractWorkbench.test.ts src/hooks/useExtractionJobRunner.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/hooks/useExtractionJobRunner.ts web/src/hooks/useExtractionJobRunner.test.ts web/src/pages/useExtractWorkbench.tsx web/src/components/documents/ExtractCompactFileList.tsx web/src/pages/useExtractWorkbench.test.ts
git commit -m "feat: connect extract workbench to async jobs"
```

---

## Final Verification

Before claiming completion, use `@verification-before-completion`.

Run these commands:

1. `npx supabase db reset`
Expected: PASS

2. `deno test supabase/functions/_shared/parse_pipeline_contract.test.ts supabase/functions/conversion-complete/index.test.ts supabase/functions/extract-readiness/index.test.ts supabase/functions/_shared/docling_page_text.test.ts supabase/functions/run-extract/index.test.ts supabase/functions/_shared/extraction_prompt.test.ts supabase/functions/extract-worker/index.test.ts`
Expected: PASS

3. `deno test supabase/functions/parse-profile-readiness/index.test.ts`
Expected: PASS

4. `cd web && npm run test -- src/components/documents/ParseConfigColumn.test.tsx src/hooks/useExtractRuntimeReadiness.test.ts src/pages/useExtractWorkbench.test.ts src/hooks/useExtractionJobRunner.test.ts`
Expected: PASS

5. Manual smoke test:
- parse one PDF with the "Balanced" profile
- verify the Parse UI shows whether `Fast`, `Balanced`, `High Quality`, and `AI Vision` are runtime-ready before dispatch
- confirm the Parse UI shows both requested and applied runtime info
- submit document-level extraction and confirm `run-extract` returns immediately
- watch the job move `queued -> running -> complete`
- confirm one result row appears before the UI claims completion

## Rollout Notes

- Deploy `trigger-parse` and `conversion-complete` with the new callback contract before enabling the parse-runtime UI fields.
- Do not expose the extraction run button in production until `extract-readiness` reports ready in the target environment.
- The first follow-up after this plan should be a true server-side scheduler or cron-driven worker if the client-driven loop proves insufficient under real load.
