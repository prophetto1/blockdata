# Docling Profiles Operationalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Docling parsing profiles actually affect parse runs end-to-end so selecting `Fast`, `Balanced`, `High Quality`, or `AI Vision` changes the real Docling pipeline used for that document.

**Architecture:** Keep `trigger-parse` as the profile selector and source of truth for the chosen config, keep `conversion-complete` as the persistence point for the run metadata, and make `services/platform-api` the only production conversion runtime. Treat the checked-in `platform-api` config-aware converter as the canonical implementation, close the remaining field-mapping gaps, deploy it, and either retire or backport the legacy `conversion-service` until cutover is complete.

**Tech Stack:** React 19, Supabase Edge Functions, Supabase Postgres, Python 3.11, FastAPI, Docling, Cloud Run, gcloud CLI, pytest

## Current State

The current system is split across three different states:

1. The UI and database already expose real Docling profiles.
2. The local `platform-api` repo has partial profile support.
3. The live GCP deployment is behind the repo and still does not accept `pipeline_config` on `/convert`.

### Evidence

- UI profiles exist in [`web/src/pages/ParsePage.tsx`](/e:/writing-system/web/src/pages/ParsePage.tsx) and are sent by [`web/src/hooks/useBatchParse.ts`](/e:/writing-system/web/src/hooks/useBatchParse.ts).
- The edge function resolves `profile_id` to `pipeline_config` and forwards it in [`supabase/functions/trigger-parse/index.ts`](/e:/writing-system/supabase/functions/trigger-parse/index.ts).
- The callback persists `pipeline_config` into `conversion_parsing` in [`supabase/functions/conversion-complete/index.ts`](/e:/writing-system/supabase/functions/conversion-complete/index.ts).
- The local `platform-api` request model includes `pipeline_config` in [`services/platform-api/app/domain/conversion/models.py`](/e:/writing-system/services/platform-api/app/domain/conversion/models.py).
- The local `platform-api` conversion route echoes `pipeline_config` in [`services/platform-api/app/api/routes/conversion.py`](/e:/writing-system/services/platform-api/app/api/routes/conversion.py).
- The local `platform-api` converter already branches on `req.pipeline_config` in [`services/platform-api/app/domain/conversion/service.py`](/e:/writing-system/services/platform-api/app/domain/conversion/service.py).
- The legacy runtime still ignores profiles in [`services/conversion-service/app/main.py`](/e:/writing-system/services/conversion-service/app/main.py).
- The live Cloud Run `blockdata-platform-api` OpenAPI on March 13, 2026 still exposes `/convert` without a `pipeline_config` field, so GCP is not yet running the current config-aware code.

### Profiles Present In The Live DB

The live `parsing_profiles` table currently contains these Docling presets:

- `Fast`
- `Balanced`
- `High Quality`
- `AI Vision`

Those rows exist, but today they are not reliably operational because the live parser endpoint is not accepting the full config payload.

## Scope

### In Scope

- Make profile selection change the actual Docling converter used for a parse run.
- Ensure the selected config is accepted by the live Python runtime.
- Ensure the selected config is persisted with the parse run.
- Verify the four seeded Docling profiles produce meaningfully different runs.
- Remove ambiguity between `platform-api` and the legacy `conversion-service`.

### Out of Scope

- Full redesign of the Docling settings UI.
- New profile concepts or new DB schema.
- GPU `docling-serve` offload.
- Non-Docling parsers.

## Task 1: Standardize On One Live Conversion Runtime

**Files:**
- Verify: [`services/platform-api/app/domain/conversion/models.py`](/e:/writing-system/services/platform-api/app/domain/conversion/models.py)
- Verify: [`services/platform-api/app/api/routes/conversion.py`](/e:/writing-system/services/platform-api/app/api/routes/conversion.py)
- Verify: [`scripts/deploy-cloud-run-platform-api.ps1`](/e:/writing-system/scripts/deploy-cloud-run-platform-api.ps1)
- Reference: [`scripts/deploy-cloud-run-conversion-service.ps1`](/e:/writing-system/scripts/deploy-cloud-run-conversion-service.ps1)
- Document: [`docs/plans/2026-03-13-docling-profiles-operationalization.md`](/e:/writing-system/docs/plans/2026-03-13-docling-profiles-operationalization.md)

**Step 1: Verify the checked-in `platform-api` contract is the intended production contract**

Confirm these conditions:

- `ConvertRequest` includes `pipeline_config`
- `/convert` includes `pipeline_config` in the callback payload
- `trigger-parse` already forwards `pipeline_config`

Expected result:

- No code change needed in these files if local code still matches current state.

**Step 2: Deploy `platform-api` so the live OpenAPI matches the checked-in model**

Run:

```powershell
pwsh -File scripts/deploy-cloud-run-platform-api.ps1 -ProjectId agchain -Region us-central1 -UseExistingSecret
```

Expected:

- Cloud Run deploy succeeds.
- `blockdata-platform-api` gets a new ready revision.

**Step 3: Verify the live `/convert` schema now accepts `pipeline_config`**

Run:

```powershell
curl.exe -sS https://blockdata-platform-api-sqsmf5q2rq-uc.a.run.app/openapi.json
```

Check:

- `components.schemas.ConvertRequest.properties.pipeline_config` exists.

Expected:

- The live API schema matches the checked-in Python model.

**Step 4: Point the caller at `platform-api`**

Operational action:

- Update the live `CONVERSION_SERVICE_URL` used by Supabase Edge Functions so `trigger-parse` posts to `blockdata-platform-api`, not the old `writing-system-conversion-service`.

Expected:

- All new parse requests hit the config-aware service.

**Step 5: Commit**

If any repo files changed:

```bash
git add services/platform-api/app/domain/conversion/models.py services/platform-api/app/api/routes/conversion.py scripts/deploy-cloud-run-platform-api.ps1
git commit -m "chore: cut docling parsing traffic to platform-api"
```

## Task 2: Make The Four Seeded Profiles Produce Real Pipeline Differences

**Files:**
- Modify: [`services/platform-api/app/domain/conversion/service.py`](/e:/writing-system/services/platform-api/app/domain/conversion/service.py)
- Test: [`services/platform-api/tests/test_conversion.py`](/e:/writing-system/services/platform-api/tests/test_conversion.py)

**Step 1: Write failing tests for the seeded profile behaviors**

Add focused tests for:

- `Fast` builds a standard converter with Tesseract CLI OCR and `TableFormerMode.FAST`
- `Balanced` builds a standard converter with EasyOCR and picture classification enabled
- `High Quality` builds a standard converter with `TableFormerMode.ACCURATE`, code enrichment, formula enrichment, picture generation, picture description, and chart extraction enabled
- `AI Vision` builds a VLM converter and uses a VLM preset
- Internal metadata keys like `_profile_id` and `_profile_name` are ignored

Test shape:

```python
def test_fast_profile_builds_tesseract_fast_table_pipeline():
    config = {
        "pipeline": "standard",
        "pdf_pipeline": {
            "do_ocr": True,
            "ocr_options": {"kind": "tesseract", "lang": ["eng"]},
            "do_table_structure": True,
            "table_structure_options": {"mode": "fast", "do_cell_matching": True},
        },
    }
    converter = svc._build_docling_converter(config)
    pdf_opt = converter.format_options[InputFormat.PDF]
    assert isinstance(pdf_opt.pipeline_options.ocr_options, TesseractCliOcrOptions)
    assert pdf_opt.pipeline_options.table_structure_options.mode == TableFormerMode.FAST
```

**Step 2: Run the tests and confirm current failures**

Run:

```powershell
pytest services/platform-api/tests/test_conversion.py -q
```

Expected:

- At least one of the new profile-behavior tests fails until the missing mappings are implemented.

**Step 3: Fill the remaining mapping gaps in `service.py`**

Implement the missing or incomplete mappings needed for the seeded profiles first:

- Honor `pdf_pipeline.layout_options.model` if Docling’s active API supports it.
- Honor VLM `response_format`, `scale`, `max_size`, and `batch_size` if supported.
- Honor enrichment option payloads only where Docling expects them.
- Keep unsupported fields logged and ignored explicitly instead of silently disappearing.

Important rule:

- Prioritize the exact fields used by the four seeded profiles before broad full-schema support.

**Step 4: Run the tests again**

Run:

```powershell
pytest services/platform-api/tests/test_conversion.py -q
```

Expected:

- The new profile-specific tests pass.

**Step 5: Commit**

```bash
git add services/platform-api/app/domain/conversion/service.py services/platform-api/tests/test_conversion.py
git commit -m "feat: apply docling parsing profiles in platform-api"
```

## Task 3: Remove The Legacy Runtime As A Source Of Wrong Behavior

**Files:**
- Modify: [`services/conversion-service/app/main.py`](/e:/writing-system/services/conversion-service/app/main.py)
- Test: [`services/conversion-service/tests/test_main.py`](/e:/writing-system/services/conversion-service/tests/test_main.py)
- Optional docs: [`scripts/deploy-cloud-run-conversion-service.ps1`](/e:/writing-system/scripts/deploy-cloud-run-conversion-service.ps1)

**Step 1: Choose one of two paths**

Option A:

- Retire `writing-system-conversion-service` immediately after Task 1 cutover.

Option B:

- Backport the same `pipeline_config` support so old traffic cannot silently ignore profiles during the transition.

Recommended:

- Do both in sequence: backport now, then retire after traffic is confirmed on `platform-api`.

**Step 2: Add failing regression tests to the legacy service**

Add a test that passes `pipeline_config` and verifies `_build_docling_converter()` receives it.

Test shape:

```python
def test_convert_uses_pipeline_config(monkeypatch):
    seen = {}
    def fake_build(config=None):
        seen["config"] = config
        return FakeConverter()
    monkeypatch.setattr(conversion_main, "_build_docling_converter", fake_build)
    req = _build_request(track="docling", source_type="pdf")
    req.pipeline_config = {"pipeline": "vlm"}
    asyncio.run(conversion_main._convert(req))
    assert seen["config"] == {"pipeline": "vlm"}
```

**Step 3: Implement the minimal backport**

Required changes:

- Add `pipeline_config` to the legacy `ConvertRequest`
- Include `pipeline_config` in the callback payload
- Change `_convert()` to call `_build_docling_converter(req.pipeline_config)`

**Step 4: Run the legacy tests**

Run:

```powershell
pytest services/conversion-service/tests/test_main.py -q
```

Expected:

- The legacy service no longer silently discards profile config.

**Step 5: Commit**

```bash
git add services/conversion-service/app/main.py services/conversion-service/tests/test_main.py
git commit -m "fix: backport docling profile config to legacy conversion service"
```

## Task 4: Verify Persistence And User-Visible Behavior End To End

**Files:**
- Verify: [`supabase/functions/trigger-parse/index.ts`](/e:/writing-system/supabase/functions/trigger-parse/index.ts)
- Verify: [`supabase/functions/conversion-complete/index.ts`](/e:/writing-system/supabase/functions/conversion-complete/index.ts)
- Verify: [`web/src/pages/ParsePage.tsx`](/e:/writing-system/web/src/pages/ParsePage.tsx)
- Verify: [`web/src/hooks/useBatchParse.ts`](/e:/writing-system/web/src/hooks/useBatchParse.ts)

**Step 1: Confirm `trigger-parse` stores the chosen profile config before completion**

Run SQL:

```sql
select source_uid, pipeline_config
from public.conversion_parsing
where source_uid = '<test-source-uid>';
```

Expected:

- The row appears quickly after dispatch and includes the chosen profile config plus `_profile_id` metadata.

**Step 2: Confirm `conversion-complete` preserves the config on success**

Run SQL:

```sql
select source_uid, conv_parsing_tool, pipeline_config
from public.conversion_parsing
where source_uid = '<test-source-uid>';
```

Expected:

- `conv_parsing_tool = 'docling'`
- `pipeline_config` still matches the selected profile payload.

**Step 3: Run one real parse per seeded profile**

Use the same source document four times:

- `Fast`
- `Balanced`
- `High Quality`
- `AI Vision`

Expected:

- `Fast` and `Balanced` both run standard pipelines, but differ in OCR engine.
- `High Quality` differs from `Fast` on table mode and enabled enrichments.
- `AI Vision` runs the VLM pipeline, not the standard PDF pipeline.

**Step 4: Compare stored configs and output artifacts**

Check:

- `conversion_parsing.pipeline_config`
- artifact hashes in `conversion_representations`
- output differences in `.docling.json`, `.html`, or `.doctags`

Minimum acceptance check:

- `Fast` and `High Quality` do not produce identical pipeline configs
- `AI Vision` stores `"pipeline": "vlm"`
- at least one output artifact hash differs between `Fast` and `High Quality`

**Step 5: Verify the live runtime directly**

Run:

```powershell
gcloud.cmd run services describe blockdata-platform-api --project agchain --region us-central1 --format=json
```

Check:

- active revision is the newly deployed revision
- service remains healthy after real parse traffic

## Task 5: Clean Up The Full-Schema Gap After The Seeded Profiles Work

**Files:**
- Modify: [`services/platform-api/app/domain/conversion/service.py`](/e:/writing-system/services/platform-api/app/domain/conversion/service.py)
- Expand tests: [`services/platform-api/tests/test_conversion.py`](/e:/writing-system/services/platform-api/tests/test_conversion.py)
- Reference schema: [`docs/pipeline/2026-03-10-parsing-pipeline-profiles.md`](/e:/writing-system/docs/pipeline/2026-03-10-parsing-pipeline-profiles.md)

**Step 1: Add explicit coverage for unsupported fields**

Document and test what happens for:

- `layout_options`
- `code_formula_options`
- `picture_description_options`
- `backend_options`
- `asr_pipeline`

**Step 2: Either implement them or reject them clearly**

Preferred rule:

- If a field is shown in the UI and can materially affect parsing, either wire it into Docling or return a clear validation error before dispatch.

**Step 3: Add a validator or normalization layer**

Add a single normalization function, for example:

```python
def normalize_pipeline_config(config: dict[str, Any]) -> dict[str, Any]:
    ...
```

Use it before building the converter so field cleanup is centralized.

**Step 4: Run tests**

Run:

```powershell
pytest services/platform-api/tests/test_conversion.py -q
```

Expected:

- Unsupported-but-visible fields are no longer silently ignored.

**Step 5: Commit**

```bash
git add services/platform-api/app/domain/conversion/service.py services/platform-api/tests/test_conversion.py
git commit -m "feat: normalize docling pipeline profile fields"
```

## Acceptance Criteria

- The live `/convert` endpoint accepts `pipeline_config`.
- `trigger-parse` sends the selected profile config to the live conversion runtime.
- `conversion-complete` persists that config into `conversion_parsing`.
- The four seeded Docling profiles can all be selected and dispatched from the UI.
- `Fast`, `Balanced`, `High Quality`, and `AI Vision` produce meaningfully different parser behavior.
- No live parse path remains that silently ignores profile config.

## Shortest Path Recommendation

If you want the fastest route to “profiles actually work”:

1. Deploy the current `platform-api` so live `/convert` accepts `pipeline_config`.
2. Point `CONVERSION_SERVICE_URL` at `blockdata-platform-api`.
3. Backport or retire the legacy `writing-system-conversion-service`.
4. Add tests for the four seeded profiles.
5. Verify one real parse per profile.

That is the smallest path that turns the current UI from “profile-looking” into “profile-actually-applied.”
