# Parse Runtime Quick Wins Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add parse runtime audit columns, persist requested and applied pipeline config, surface runtime details in the UI, and gate extraction and parse profiles on runtime readiness.

**Architecture:** Extend `conversion_parsing` with three new JSONB columns (`requested_pipeline_config`, `applied_pipeline_config`, `parser_runtime_meta`). Update `trigger-parse` to write the requested config and `conversion-complete` to write the applied config from the callback. Recreate `view_documents` to expose all three. Add two lightweight readiness endpoints that check environment variables and auth token exchange. Wire readiness into UI hooks.

**Tech Stack:** Supabase Postgres migrations, Deno Edge Functions, TypeScript, React hooks, Vitest.

**Upstream context:**
- Merged plan: `docs/priority/2026-03-14-extraction-and-parse-verification-merged.md`
- Dependency checklist: `docs/checklists/2026-03-14-docling-implementation-dependencies-checklist.md`
- Latest migration: `20260314130000_087_upload_support_all_remove_upload_gates.sql`

---

## Scope Guardrails

- This plan covers Phase 1 (Tasks 1.1–1.4) and Phase 2 (Tasks 2.1–2.2) of the merged plan only.
- No extraction tables, edge functions, or workbench changes in this plan.
- The external conversion service (Phase 2, Task 2.3) is out of scope — it lives in a separate repo.
- Parse profile readiness (Task 8) does NOT probe the conversion service. It classifies profiles by inspecting the seeded config JSON for VLM or enrichment dependencies. Profiles that require backends the platform cannot verify are marked `is_ready: false`. This is a config-based inference gate, not a live probe.

---

### Task 1: Parse Runtime Audit Migration

**Files:**
- Create: `supabase/migrations/20260314140000_088_parse_runtime_audit.sql`

**Step 1: Write the migration**

Create `supabase/migrations/20260314140000_088_parse_runtime_audit.sql`:

```sql
-- Add parse runtime audit columns so the platform can record what
-- the conversion service was asked to do vs what it actually did.

ALTER TABLE public.conversion_parsing
  ADD COLUMN IF NOT EXISTS requested_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS applied_pipeline_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parser_runtime_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: copy existing pipeline_config into the new requested/applied columns
-- so that already-parsed documents have consistent data.
UPDATE public.conversion_parsing
SET
  requested_pipeline_config = COALESCE(pipeline_config, '{}'::jsonb),
  applied_pipeline_config = COALESCE(pipeline_config, '{}'::jsonb)
WHERE requested_pipeline_config = '{}'::jsonb
  AND pipeline_config IS NOT NULL
  AND pipeline_config != '{}'::jsonb;

-- Recreate view_documents to expose the new columns.
-- This must match the column list from migration _084_ plus the three new columns.
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
Expected: PASS. No errors. The `view_documents` view now includes the three new columns.

**Step 3: Verify columns exist**

Run: `npx supabase db reset 2>&1 | tail -5`
Expected: clean exit, no migration errors.

**Step 4: Commit**

```bash
git add supabase/migrations/20260314140000_088_parse_runtime_audit.sql
git commit -m "feat: add parse runtime audit columns to conversion_parsing and view_documents"
```

---

### Task 2: `buildRequestedPipelineConfig` Helper

**Files:**
- Create: `supabase/functions/_shared/parse_pipeline_contract.ts`
- Create: `supabase/functions/_shared/parse_pipeline_contract.test.ts`

**Step 1: Write the failing tests**

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

Deno.test("null profile returns empty object", () => {
  const result = buildRequestedPipelineConfig({
    profileId: null,
    profileConfig: null,
    configOverride: null,
  });

  assertEquals(result, {});
});

Deno.test("profile without name sets _profile_name to null", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-2",
    profileConfig: { pipeline: "standard" },
    configOverride: null,
  });

  assertEquals(result, {
    pipeline: "standard",
    _profile_id: "profile-2",
    _profile_name: null,
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/_shared/parse_pipeline_contract.test.ts`
Expected: FAIL — `parse_pipeline_contract.ts` does not exist.

**Step 3: Implement the helper**

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
    _profile_name:
      typeof profileConfig.name === "string" ? profileConfig.name : null,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd supabase && deno test functions/_shared/parse_pipeline_contract.test.ts`
Expected: PASS — all 4 tests.

**Step 5: Commit**

```bash
git add supabase/functions/_shared/parse_pipeline_contract.ts supabase/functions/_shared/parse_pipeline_contract.test.ts
git commit -m "feat: add buildRequestedPipelineConfig helper with tests"
```

---

### Task 3: Wire `trigger-parse` to Persist Requested Config

**Files:**
- Modify: `supabase/functions/trigger-parse/index.ts`

**Context:** `trigger-parse` already resolves `pipeline_config` at lines 60–73. It inserts a pending `conversion_parsing` row at line 181. It sends `pipeline_config` in the `/convert` POST body at line 219. We need to:
1. Import and call `buildRequestedPipelineConfig` instead of the inline decoration
2. Write `requested_pipeline_config` on the pre-insert row
3. Keep populating the legacy `pipeline_config` column for backward compatibility

**Step 1: Read trigger-parse to confirm current state**

Read `supabase/functions/trigger-parse/index.ts` — confirm the profile resolution block (lines 60–73) and the `conversion_parsing` insert (lines 177–195).

**Step 2: Modify trigger-parse**

At the top of the file, add the import:

```typescript
import { buildRequestedPipelineConfig } from "../_shared/parse_pipeline_contract.ts";
```

Replace the inline profile decoration logic (lines 60–73). The current code uses these exact variable names:
- `configOverride` (from destructured request body, line 31)
- `profile_id` (from destructured request body, line 31)
- `supabaseAdmin` (created at line 38)
- `pipeline_config` (local variable, line 61)
- The profile query uses `.eq("id", profile_id)` and `.select("config")` (lines 65–68)
- Profile name is extracted from `profile.config.name` (line 72)

Replace lines 60–73 with:

```typescript
    // Resolve pipeline config: explicit override > profile lookup > empty (service defaults).
    let pipeline_config: Record<string, unknown> = {};
    if (configOverride && typeof configOverride === "object" && Object.keys(configOverride).length > 0) {
      pipeline_config = configOverride;
    } else if (profile_id && typeof profile_id === "string") {
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("parsing_profiles")
        .select("config")
        .eq("id", profile_id)
        .single();
      if (profileErr) throw new Error(`Profile lookup failed: ${profileErr.message}`);
      pipeline_config = buildRequestedPipelineConfig({
        profileId: profile_id,
        profileConfig: (profile.config as Record<string, unknown>) ?? null,
        configOverride: null,
      });
    }
```

This preserves the existing variable names (`configOverride`, `profile_id`, `supabaseAdmin`, `pipeline_config`) and query shape (`.eq("id", profile_id)`, `.select("config")`).

In the `conversion_parsing` insert (line ~181), add `requested_pipeline_config` alongside the existing `pipeline_config`:

```typescript
          pipeline_config,
          requested_pipeline_config: pipeline_config,
```

The `/convert` POST body at line 219 already sends `pipeline_config` — no change needed there.

**Step 3: Verify the app still builds**

Run: `cd supabase && deno check functions/trigger-parse/index.ts`
Expected: no type errors.

**Step 4: Commit**

```bash
git add supabase/functions/trigger-parse/index.ts
git commit -m "feat: persist requested_pipeline_config in trigger-parse"
```

---

### Task 4: Make `conversion-complete` Persist Applied Config

**Files:**
- Modify: `supabase/functions/conversion-complete/index.ts`
- Create: `supabase/functions/conversion-complete/index.test.ts`

**Context:** `conversion-complete` receives the callback from the external conversion service. Its body type is at lines 13–27. It upserts `conversion_parsing` at lines 320–338. We need to:
1. Accept two new optional fields: `applied_pipeline_config` and `parser_runtime_meta`
2. Persist them in the upsert, falling back to `pipeline_config` for backward compat

**Step 1: Write the failing tests**

Create `supabase/functions/conversion-complete/index.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";

// Unit-test the applied config fallback logic in isolation.
// We extract it so conversion-complete can call it.

import { resolveAppliedConfig } from "../_shared/parse_pipeline_contract.ts";

Deno.test("modern callback: applied config and runtime meta are used directly", () => {
  const result = resolveAppliedConfig({
    pipelineConfig: { name: "Balanced" },
    appliedPipelineConfig: { pipeline: "standard", ocr: "easyocr" },
    parserRuntimeMeta: { parser: "docling", parser_version: "0.19.0" },
  });

  assertEquals(result.requestedPipelineConfig, { name: "Balanced" });
  assertEquals(result.appliedPipelineConfig, { pipeline: "standard", ocr: "easyocr" });
  assertEquals(result.parserRuntimeMeta, { parser: "docling", parser_version: "0.19.0" });
});

Deno.test("legacy callback: falls back pipeline_config into both requested and applied", () => {
  const result = resolveAppliedConfig({
    pipelineConfig: { name: "Fast" },
    appliedPipelineConfig: undefined,
    parserRuntimeMeta: undefined,
  });

  assertEquals(result.requestedPipelineConfig, { name: "Fast" });
  assertEquals(result.appliedPipelineConfig, { name: "Fast" });
  assertEquals(result.parserRuntimeMeta, {});
});

Deno.test("null pipeline_config: all fields default to empty objects", () => {
  const result = resolveAppliedConfig({
    pipelineConfig: null,
    appliedPipelineConfig: null,
    parserRuntimeMeta: null,
  });

  assertEquals(result.requestedPipelineConfig, {});
  assertEquals(result.appliedPipelineConfig, {});
  assertEquals(result.parserRuntimeMeta, {});
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/conversion-complete/index.test.ts`
Expected: FAIL — `resolveAppliedConfig` does not exist.

**Step 3: Add `resolveAppliedConfig` to the shared helper**

Add to `supabase/functions/_shared/parse_pipeline_contract.ts`:

```typescript
type ResolveAppliedConfigArgs = {
  pipelineConfig: Record<string, unknown> | null | undefined;
  appliedPipelineConfig: Record<string, unknown> | null | undefined;
  parserRuntimeMeta: Record<string, unknown> | null | undefined;
};

type ResolvedAppliedConfig = {
  requestedPipelineConfig: Record<string, unknown>;
  appliedPipelineConfig: Record<string, unknown>;
  parserRuntimeMeta: Record<string, unknown>;
};

export function resolveAppliedConfig(
  args: ResolveAppliedConfigArgs,
): ResolvedAppliedConfig {
  const requested = args.pipelineConfig ?? {};
  return {
    requestedPipelineConfig: requested,
    appliedPipelineConfig: args.appliedPipelineConfig ?? requested,
    parserRuntimeMeta: args.parserRuntimeMeta ?? {},
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd supabase && deno test functions/conversion-complete/index.test.ts`
Expected: PASS — all 3 tests.

**Step 5: Wire `conversion-complete` to use the helper**

Modify `supabase/functions/conversion-complete/index.ts`:

1. Update the type at line ~13 — add two optional fields after `pipeline_config`:

```typescript
applied_pipeline_config?: Record<string, unknown> | null;
parser_runtime_meta?: Record<string, unknown> | null;
```

2. Import at the top:

```typescript
import { resolveAppliedConfig } from "../_shared/parse_pipeline_contract.ts";
```

3. Before the upsert at line ~320, resolve the config:

```typescript
const resolved = resolveAppliedConfig({
  pipelineConfig: body.pipeline_config,
  appliedPipelineConfig: body.applied_pipeline_config,
  parserRuntimeMeta: body.parser_runtime_meta,
});
```

4. In the upsert object, replace the `pipeline_config` line and add:

```typescript
pipeline_config: resolved.requestedPipelineConfig,
requested_pipeline_config: resolved.requestedPipelineConfig,
applied_pipeline_config: resolved.appliedPipelineConfig,
parser_runtime_meta: resolved.parserRuntimeMeta,
```

**Step 6: Verify type-check**

Run: `cd supabase && deno check functions/conversion-complete/index.ts`
Expected: no type errors.

**Step 7: Commit**

```bash
git add supabase/functions/_shared/parse_pipeline_contract.ts supabase/functions/conversion-complete/index.ts supabase/functions/conversion-complete/index.test.ts
git commit -m "feat: persist applied parse config and runtime meta in conversion-complete"
```

---

### Task 5: Surface Parse Runtime Details in the UI

**Files:**
- Modify: `web/src/lib/types.ts:18-33`
- Modify: `web/src/pages/parseArtifacts.ts:75-83`
- Modify: `web/src/components/documents/ParseConfigColumn.tsx`

**Step 1: Extend `DocumentRow` type**

In `web/src/lib/types.ts`, add three optional fields after `pipeline_config` (around line 31):

```typescript
requested_pipeline_config?: Record<string, unknown> | null;
applied_pipeline_config?: Record<string, unknown> | null;
parser_runtime_meta?: Record<string, unknown> | null;
```

**Step 2: Extend the cache key in `parseArtifacts.ts`**

In `web/src/pages/parseArtifacts.ts`, inside `getParseArtifactCacheKey` (around line 81), add after the `pipeline_config` line:

```typescript
requested_pipeline_config: doc.requested_pipeline_config ?? null,
applied_pipeline_config: doc.applied_pipeline_config ?? null,
parser_runtime_meta: doc.parser_runtime_meta ?? null,
```

**Step 3: Add runtime display to `ParseConfigColumn.tsx`**

In `web/src/components/documents/ParseConfigColumn.tsx`, add a "Runtime Details" section after the existing profile display (after line ~191). This section only renders when `selectedDoc` has the new fields:

```tsx
{/* Runtime audit details — only visible after conversion-complete sends them */}
{selectedDoc?.parser_runtime_meta &&
  Object.keys(selectedDoc.parser_runtime_meta).length > 0 && (
  <div className="mt-3 space-y-1 text-xs text-zinc-400">
    <div className="font-medium text-zinc-300">Applied Runtime</div>
    {selectedDoc.parser_runtime_meta.parser_version && (
      <div>Parser: {String(selectedDoc.parser_runtime_meta.parser_version)}</div>
    )}
    {selectedDoc.parser_runtime_meta.ocr_backend && (
      <div>OCR: {String(selectedDoc.parser_runtime_meta.ocr_backend)}</div>
    )}
    {selectedDoc.parser_runtime_meta.vlm_model && (
      <div>VLM: {String(selectedDoc.parser_runtime_meta.vlm_model)}</div>
    )}
    {selectedDoc.applied_pipeline_config &&
      JSON.stringify(selectedDoc.applied_pipeline_config) !==
        JSON.stringify(selectedDoc.requested_pipeline_config) && (
      <div className="text-amber-400">
        Applied config differs from requested config
      </div>
    )}
  </div>
)}
```

**Step 4: Verify the web app builds**

Run: `cd web && npx tsc --noEmit`
Expected: no type errors.

**Step 5: Commit**

```bash
git add web/src/lib/types.ts web/src/pages/parseArtifacts.ts web/src/components/documents/ParseConfigColumn.tsx
git commit -m "feat: surface parse runtime audit details in UI"
```

---

### Task 6: Extraction Runtime Readiness Endpoint

**Files:**
- Create: `supabase/functions/extract-readiness/index.ts`
- Create: `supabase/functions/extract-readiness/index.test.ts`

**Context:** This endpoint checks whether the platform can run structured extraction on Vertex. It probes for required env vars and attempts a token exchange. The extract workbench (built later) will call this to gate the "Run Extraction" button.

**Step 1: Write the failing tests**

Create `supabase/functions/extract-readiness/index.test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import { checkExtractReadiness } from "./readiness_check.ts";

Deno.test("not ready when GCP_VERTEX_SA_KEY is missing", () => {
  const result = checkExtractReadiness({
    gcpVertexSaKey: undefined,
    gcpVertexProjectId: "agchain",
  });

  assertEquals(result.is_ready, false);
  assertEquals(result.reasons.length > 0, true);
  assertEquals(result.reasons[0], "Missing GCP_VERTEX_SA_KEY");
});

Deno.test("not ready when GCP_VERTEX_PROJECT_ID is missing", () => {
  const result = checkExtractReadiness({
    gcpVertexSaKey: "some-key",
    gcpVertexProjectId: undefined,
  });

  assertEquals(result.is_ready, false);
  assertEquals(result.reasons[0], "Missing GCP_VERTEX_PROJECT_ID");
});

Deno.test("env check passes when both vars are present", () => {
  const result = checkExtractReadiness({
    gcpVertexSaKey: "some-key",
    gcpVertexProjectId: "agchain",
  });

  assertEquals(result.is_ready, true);
  assertEquals(result.reasons.length, 0);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/extract-readiness/index.test.ts`
Expected: FAIL — `readiness_check.ts` does not exist.

**Step 3: Implement the readiness check (pure function)**

Create `supabase/functions/extract-readiness/readiness_check.ts`:

```typescript
type ReadinessInput = {
  gcpVertexSaKey: string | undefined;
  gcpVertexProjectId: string | undefined;
};

type ReadinessResult = {
  is_ready: boolean;
  reasons: string[];
};

export function checkExtractReadiness(input: ReadinessInput): ReadinessResult {
  const reasons: string[] = [];

  if (!input.gcpVertexSaKey) reasons.push("Missing GCP_VERTEX_SA_KEY");
  if (!input.gcpVertexProjectId) reasons.push("Missing GCP_VERTEX_PROJECT_ID");

  return { is_ready: reasons.length === 0, reasons };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd supabase && deno test functions/extract-readiness/index.test.ts`
Expected: PASS — all 3 tests.

**Step 5: Implement the edge function**

Create `supabase/functions/extract-readiness/index.ts`:

```typescript
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { requireUserId } from "../_shared/supabase.ts";
import { getVertexAccessToken } from "../_shared/vertex_auth.ts";
import { checkExtractReadiness } from "./readiness_check.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    await requireUserId(req);
  } catch {
    return json(401, { error: "Unauthorized" });
  }

  // Phase 1: env var check
  const envResult = checkExtractReadiness({
    gcpVertexSaKey: Deno.env.get("GCP_VERTEX_SA_KEY"),
    gcpVertexProjectId: Deno.env.get("GCP_VERTEX_PROJECT_ID"),
  });

  if (!envResult.is_ready) {
    return json(200, envResult);
  }

  // Phase 2: live token exchange
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

**Step 6: Verify type-check**

Run: `cd supabase && deno check functions/extract-readiness/index.ts`
Expected: no type errors.

**Step 7: Commit**

```bash
git add supabase/functions/extract-readiness/readiness_check.ts supabase/functions/extract-readiness/index.ts supabase/functions/extract-readiness/index.test.ts
git commit -m "feat: add extract-readiness endpoint with env and token checks"
```

---

### Task 7: Frontend Readiness Hook

**Files:**
- Create: `web/src/hooks/useExtractRuntimeReadiness.ts`

**Context:** This hook calls the `extract-readiness` endpoint once on mount and exposes `isReady`, `reasons`, and `loading`. The extract workbench (built later) will consume this to disable the "Run Extraction" button.

**Step 1: Implement the hook**

Create `web/src/hooks/useExtractRuntimeReadiness.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ReadinessState = {
  isReady: boolean;
  reasons: string[];
  loading: boolean;
  error: string | null;
};

export function useExtractRuntimeReadiness() {
  const [state, setState] = useState<ReadinessState>({
    isReady: false,
    reasons: [],
    loading: true,
    error: null,
  });

  const check = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke('extract-readiness');
      if (error) {
        setState({ isReady: false, reasons: [], loading: false, error: error.message });
        return;
      }
      const result = data as { is_ready: boolean; reasons: string[] };
      setState({
        isReady: result.is_ready,
        reasons: result.reasons,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState({
        isReady: false,
        reasons: [],
        loading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  return { ...state, recheck: check };
}
```

**Step 2: Verify the web app builds**

Run: `cd web && npx tsc --noEmit`
Expected: no type errors.

**Step 3: Commit**

```bash
git add web/src/hooks/useExtractRuntimeReadiness.ts
git commit -m "feat: add useExtractRuntimeReadiness hook"
```

---

### Task 8: Parse Profile Readiness Endpoint

**Files:**
- Create: `supabase/functions/parse-profile-readiness/index.ts`
- Create: `supabase/functions/parse-profile-readiness/readiness_check.ts`
- Create: `supabase/functions/parse-profile-readiness/index.test.ts`

**Context:** This endpoint classifies each seeded profile by inspecting its config JSON for VLM or enrichment-model dependencies. It does NOT probe the conversion service. Profiles that only need OCR (Fast, Balanced) are marked ready. Profiles that require a VLM (`AI Vision`) or enrichment models (`High Quality` with `do_picture_description` / `do_chart_extraction`) are marked not ready because this platform cannot verify those backends are configured without conversion service runtime reporting.

**Important schema note:** The `parsing_profiles` table has columns `id` (uuid), `parser` (text), and `config` (jsonb). There is no `profile_id` or `profile_name` column — the profile name is stored inside `config.name`. The endpoint must select `id, parser, config` and extract the name from `config->>'name'`.

**Important config shape note:** Enrichment flags (`do_picture_description`, `do_chart_extraction`, `do_picture_classification`) live under the top-level `enrichments` key in the config JSON, NOT under `pdf_pipeline.pipeline_options`. See the seeded profiles in `20260310120000_075_parsing_pipeline_config.sql`.

**Step 1: Write the failing tests**

Create `supabase/functions/parse-profile-readiness/index.test.ts`:

Test fixtures match the actual seeded config shape from `20260310120000_075_parsing_pipeline_config.sql`:
- Enrichments live under top-level `enrichments` key, not `pdf_pipeline.pipeline_options`
- VLM preset lives under `vlm_pipeline.vlm_options.preset`
- Profile name lives inside `config.name`

```typescript
import { assertEquals } from "jsr:@std/assert";
import { classifyProfileReadiness } from "./readiness_check.ts";

Deno.test("Fast profile: ready (OCR only, no VLM, no enrichment)", () => {
  // Matches seeded Fast profile shape
  const result = classifyProfileReadiness({
    config: {
      name: "Fast",
      pipeline: "standard",
      pdf_pipeline: {
        do_ocr: true,
        ocr_options: { kind: "tesseract", lang: ["eng"] },
      },
      enrichments: {},
    },
  });

  assertEquals(result.is_ready, true);
  assertEquals(result.profile_name, "Fast");
  assertEquals(result.requirements.vlm_model, null);
  assertEquals(result.requirements.enrichment_models, []);
});

Deno.test("Balanced profile: ready (OCR only, picture_classification is not a model-backed enrichment)", () => {
  // Matches seeded Balanced profile shape
  const result = classifyProfileReadiness({
    config: {
      name: "Balanced",
      is_default: true,
      pipeline: "standard",
      pdf_pipeline: {
        do_ocr: true,
        ocr_options: { kind: "easyocr", lang: ["en"] },
      },
      enrichments: { do_picture_classification: true },
    },
  });

  assertEquals(result.is_ready, true);
});

Deno.test("AI Vision profile: not ready (requires VLM, cannot verify)", () => {
  // Matches seeded AI Vision profile shape
  const result = classifyProfileReadiness({
    config: {
      name: "AI Vision",
      pipeline: "vlm",
      vlm_pipeline: {
        vlm_options: { preset: "granite_docling", response_format: "doctags" },
        generate_page_images: true,
      },
      enrichments: { do_picture_description: true },
    },
  });

  assertEquals(result.is_ready, false);
  assertEquals(result.reasons.length > 0, true);
  assertEquals(result.requirements.vlm_model, "granite_docling");
});

Deno.test("High Quality profile: not ready (requires enrichment models)", () => {
  // Matches seeded High Quality profile shape — enrichments at top level
  const result = classifyProfileReadiness({
    config: {
      name: "High Quality",
      pipeline: "standard",
      pdf_pipeline: {
        do_ocr: true,
        ocr_options: { kind: "easyocr", lang: ["en"] },
        do_table_structure: true,
        table_structure_options: { mode: "accurate", do_cell_matching: true },
        do_code_enrichment: true,
        do_formula_enrichment: true,
        generate_picture_images: true,
      },
      enrichments: {
        do_picture_classification: true,
        do_picture_description: true,
        do_chart_extraction: true,
      },
    },
  });

  assertEquals(result.is_ready, false);
  assertEquals(result.requirements.enrichment_models.length > 0, true);
  assertEquals(result.requirements.enrichment_models.includes("picture_description"), true);
  assertEquals(result.requirements.enrichment_models.includes("chart_extraction"), true);
});
```

**Step 2: Run tests to verify they fail**

Run: `cd supabase && deno test functions/parse-profile-readiness/index.test.ts`
Expected: FAIL — `readiness_check.ts` does not exist.

**Step 3: Implement the readiness classifier**

Create `supabase/functions/parse-profile-readiness/readiness_check.ts`:

```typescript
type ProfileReadinessInput = {
  config: Record<string, unknown>;
};

type ProfileReadinessResult = {
  profile_name: string;
  is_ready: boolean;
  requirements: {
    ocr_backend: string | null;
    vlm_model: string | null;
    enrichment_models: string[];
  };
  reasons: string[];
};

export function classifyProfileReadiness(
  input: ProfileReadinessInput,
): ProfileReadinessResult {
  const reasons: string[] = [];
  const config = input.config;

  // Profile name is inside config.name (not a table column)
  const profileName = typeof config.name === "string" ? config.name : "Unknown";

  // OCR backend lives under config.pdf_pipeline.ocr_options.kind
  const pdfPipeline = (config.pdf_pipeline ?? {}) as Record<string, unknown>;
  const ocrOptions = (pdfPipeline.ocr_options ?? {}) as Record<string, unknown>;
  const ocrBackend = typeof ocrOptions.kind === "string" ? ocrOptions.kind : null;

  // VLM detection: config.pipeline === "vlm", preset under config.vlm_pipeline.vlm_options.preset
  let vlmModel: string | null = null;
  if (config.pipeline === "vlm") {
    const vlmPipeline = (config.vlm_pipeline ?? {}) as Record<string, unknown>;
    const vlmOptions = (vlmPipeline.vlm_options ?? {}) as Record<string, unknown>;
    vlmModel = typeof vlmOptions.preset === "string" ? vlmOptions.preset : "unknown";
    reasons.push(
      `VLM model "${vlmModel}" required but cannot be verified without conversion service runtime reporting`,
    );
  }

  // Enrichment model detection: lives under top-level config.enrichments, NOT pdf_pipeline
  // do_picture_classification is NOT model-backed (it's a Docling-internal heuristic)
  // do_picture_description and do_chart_extraction require external AI models
  const enrichments = (config.enrichments ?? {}) as Record<string, unknown>;
  const enrichmentModels: string[] = [];
  if (enrichments.do_picture_description === true) {
    enrichmentModels.push("picture_description");
  }
  if (enrichments.do_chart_extraction === true) {
    enrichmentModels.push("chart_extraction");
  }
  if (enrichmentModels.length > 0) {
    reasons.push(
      `Enrichment models [${enrichmentModels.join(", ")}] required but cannot be verified without conversion service runtime reporting`,
    );
  }

  return {
    profile_name: profileName,
    is_ready: reasons.length === 0,
    requirements: {
      ocr_backend: ocrBackend,
      vlm_model: vlmModel,
      enrichment_models: enrichmentModels,
    },
    reasons,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd supabase && deno test functions/parse-profile-readiness/index.test.ts`
Expected: PASS — all 4 tests.

**Step 5: Implement the edge function**

Create `supabase/functions/parse-profile-readiness/index.ts`:

```typescript
import { corsPreflight, withCorsHeaders } from "../_shared/cors.ts";
import { createAdminClient, requireUserId } from "../_shared/supabase.ts";
import { classifyProfileReadiness } from "./readiness_check.ts";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCorsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req) => {
  const preflight = corsPreflight(req);
  if (preflight) return preflight;

  try {
    await requireUserId(req);
  } catch {
    return json(401, { error: "Unauthorized" });
  }

  // parsing_profiles has columns: id (uuid), parser (text), config (jsonb)
  // Profile name is inside config->>'name', not a separate column.
  const db = createAdminClient();
  const { data: profiles, error } = await db
    .from("parsing_profiles")
    .select("id, parser, config");

  if (error) {
    return json(500, { error: error.message });
  }

  const results = (profiles ?? []).map((p) =>
    classifyProfileReadiness({
      config: (p.config ?? {}) as Record<string, unknown>,
    })
  );

  return json(200, { profiles: results });
});
```

**Step 6: Verify type-check**

Run: `cd supabase && deno check functions/parse-profile-readiness/index.ts`
Expected: no type errors.

**Step 7: Commit**

```bash
git add supabase/functions/parse-profile-readiness/readiness_check.ts supabase/functions/parse-profile-readiness/index.ts supabase/functions/parse-profile-readiness/index.test.ts
git commit -m "feat: add parse-profile-readiness endpoint"
```

---

## Final Verification

Before claiming completion, run all tests:

1. `npx supabase db reset` — PASS (migrations apply cleanly)
2. `cd supabase && deno test functions/_shared/parse_pipeline_contract.test.ts` — PASS
3. `cd supabase && deno test functions/conversion-complete/index.test.ts` — PASS
4. `cd supabase && deno test functions/extract-readiness/index.test.ts` — PASS
5. `cd supabase && deno test functions/parse-profile-readiness/index.test.ts` — PASS
6. `cd web && npx tsc --noEmit` — PASS

Manual smoke:
- Parse one PDF with "Balanced" profile
- Check `conversion_parsing` row has `requested_pipeline_config` populated
- After callback, `applied_pipeline_config` and `parser_runtime_meta` have data (or equal the requested config if the conversion service hasn't been updated yet)
- UI shows runtime details when `parser_runtime_meta` is non-empty
- `extract-readiness` returns `is_ready: true` or `false` with reasons
- `parse-profile-readiness` returns per-profile readiness with Fast/Balanced as `true`, AI Vision as `false`

---

## Dependency Checklist Items Resolved

After this plan, these previously-unchecked items move to `[x]`:

- [x] DB can distinguish requested profile config from applied runtime config (Task 1)
- [x] `trigger-parse` persists `requested_pipeline_config` (Task 3)
- [x] `conversion-complete` persists `applied_pipeline_config` and `parser_runtime_meta` (Task 4)
- [x] UI shows requested vs applied runtime info (Task 5)
- [x] Extraction readiness gate exists (Tasks 6–7)
- [x] Parse profile readiness gate prevents selecting unrunnable profiles (Task 8)
