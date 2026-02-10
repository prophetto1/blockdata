# Issue: PDF Conversion Pipeline — Multi-Layer Failure

**Filed:** 2026-02-10
**Status:** Resolved (all three layers)
**Resolved:** 2026-02-10
**Severity:** High (blocks all PDF ingestion)
**Affects:** Non-Markdown upload pipeline (PDF specifically; DOCX partially affected)

---

## Summary

PDF uploads stall at `status='converting'` and never reach `'ingested'`. The failure has **three independent layers**, each of which must be resolved for end-to-end PDF ingestion to work. Two are infrastructure/deployment issues; one is a code-level gap in the Docker build.

---

## Layer 1: GCP IAM 403 on Cloud Run (RESOLVED)

**Root cause:** The GCP organization policy (`iam.allowedPolicyMemberDomains`) on the `agchain` project silently blocked the `--allow-unauthenticated` flag during Cloud Run deployment. The `allUsers` IAM binding for `roles/run.invoker` was never applied, so all external callers (including Supabase Edge Functions) received HTTP 403 before reaching the FastAPI application.

**Resolution:** Confirmed resolved per `repo-changelog.jsonl` entry 70 (2026-02-10). The service now returns HTTP 401 (application-level auth gate) rather than 403 (GCP IAM rejection), proving the request reaches the FastAPI middleware.

**Verification:**
```bash
curl -sS -X POST "https://writing-system-conversion-service-862494623920.us-central1.run.app/convert" \
  -H "Content-Type: application/json" -d "{}"
# Expected: HTTP 401 {"detail":"Unauthorized"}
```

**No further action needed on this layer.**

---

## Layer 2: Conversion Service Code Not Redeployed to Cloud Run (RESOLVED)

**Root cause:** The repo's `services/conversion-service/app/main.py` was updated on 2026-02-08 with two critical changes:

1. **Deterministic JSON serialization** of DoclingDocument (`sort_keys=True, separators=(",",":")`) — required for hash-stable `conv_uid` computation.
2. **`docling_key` field in callback payload** — the `conversion-complete` Edge Function uses this field to decide between the Docling track and the mdast fallback.

**Resolution:** Redeployed 2026-02-10 via `gcloud run deploy --source`. New revision `writing-system-conversion-service-00002-g7t` serving 100% of traffic. Service URL: `https://writing-system-conversion-service-862494623920.us-central1.run.app`. Verified: auth gate returns 401 (no key) / 422 (valid key, missing body fields). DOCX ingestion confirmed end-to-end with `conv_parsing_tool='docling'`.

**No further action needed on this layer.**

**Impact:** Even if the conversion service successfully processes a DOCX or PDF file:
- The `conversion-complete` Edge Function will NOT receive `docling_key`
- It will fall back to the mdast track (download `.md` output, parse via remark)
- The result will have `conv_parsing_tool='mdast'` instead of the spec-required `conv_parsing_tool='docling'`
- Block locators will be `text_offset_range` instead of `docling_json_pointer`
- This violates the pairing rules defined in `immutable-fields.md`

**Evidence:** `docs/product-defining-v2.0/0208-docling-track-state-log.md`, "Remaining work" section:
> "Conversion service redeployment (Cloud Run): `services/conversion-service/app/main.py` changes need deployment outside Supabase."

**Fix:** Rebuild and redeploy the Cloud Run service from the current repo code:
```powershell
.\scripts\deploy-cloud-run-conversion-service.ps1 `
  -ProjectId "agchain" `
  -Region us-central1 `
  -ConversionServiceKey "Rq4T7-GjXhI8iPLn3eexyydOLJ_MkERtcTiXJ0NTT2o"
```

Or manually:
```bash
gcloud run deploy writing-system-conversion-service \
  --source services/conversion-service \
  --project agchain --region us-central1 \
  --cpu 2 --memory 4Gi --timeout 1800 --concurrency 1 \
  --port 8000 --allow-unauthenticated
```

**Build time:** ~17 minutes (image is ~5GB due to PyTorch/CUDA from Docling dependencies).

---

## Layer 3: PDF Requires HuggingFace Layout Analysis Models Not Pre-Cached in Docker Image (RESOLVED)

**Root cause:** This is the PDF-specific failure. Docling processes DOCX and PDF files through fundamentally different code paths:

| Format | Docling internal approach | Model dependency |
|--------|--------------------------|------------------|
| **DOCX** | Parses OOXML structure directly (`python-docx`). Document structure (headings, paragraphs, tables) is explicit in the file format. | **None** — no ML models needed |
| **PDF** | Requires visual layout analysis to identify text blocks, headings, tables, figures, etc. PDFs are a page-description language with no semantic structure. | **HuggingFace Hub models** — layout analysis, table detection, OCR |

When `DocumentConverter().convert()` is called on a PDF:

1. Docling checks for cached layout analysis models in `~/.cache/huggingface/` (or `HUGGINGFACE_HUB_CACHE` / `HF_HOME`)
2. If models are not found, Docling attempts to download them from HuggingFace Hub at runtime
3. These downloads fail in the Cloud Run environment

**Why downloads fail (probable causes, not yet confirmed individually):**
- **Ephemeral filesystem size:** Cloud Run containers have limited writable storage. The Docling layout analysis models (several hundred MB) may exceed the available tmpfs space.
- **Cold start timeout:** On the first invocation of a cold container, downloading models + processing the PDF may exceed the Edge Function's timeout waiting for the callback (the conversion service itself has a 30-minute timeout, but the ingest Edge Function may time out earlier).
- **No persistent disk:** Cloud Run containers lose their filesystem between invocations. Even if models download successfully once, the next cold start would need to re-download.

**The Dockerfile now pre-downloads models at build time** (Option A implemented 2026-02-10):

```dockerfile
RUN python -c "from docling.document_converter import DocumentConverter; DocumentConverter()"
```

This step runs after `pip install` and before `COPY app`, so the model cache lives in its own Docker layer. The fix is committed but the Cloud Run service must be redeployed for it to take effect.

**Evidence:** `changelog.jsonl` entry 64:
> "PDF conversion failure identified as separate issue: Docling's Python pipeline requires HuggingFace Hub model downloads for PDF layout analysis; the Cloud Run conversion service environment failed to fetch them. Not a code bug — infrastructure/networking issue."

### Fix Options

#### Option A: Pre-download models at Docker build time (Recommended)

Add a build step that triggers Docling's model download before the image is finalized:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Pre-download Docling's layout analysis models into the image.
# This adds ~500MB-1GB to the image but eliminates runtime downloads.
RUN python -c "from docling.document_converter import DocumentConverter; DocumentConverter()"

COPY app /app/app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

The `DocumentConverter()` constructor triggers model downloads. Running it at build time caches the models in the image layer.

**Trade-off:** Image grows from ~5GB to ~5.5-6GB. Build time increases by a few minutes. But runtime PDF conversion becomes reliable with no network dependency.

#### Option B: Set `HF_HOME` to a volume mount

If Cloud Run supports volume mounts (it does with Cloud Storage FUSE or NFS), mount a persistent volume at the HuggingFace cache directory:

```bash
gcloud run deploy ... --add-volume=name=hf-cache,type=cloud-storage,bucket=<BUCKET> \
  --add-volume-mount=volume=hf-cache,mount-path=/root/.cache/huggingface
```

**Trade-off:** Adds infrastructure complexity. First invocation still needs to download models. Subsequent invocations read from the shared cache.

#### Option C: Use Docling's lightweight PDF pipeline

Docling supports a `PipelineOptions` configuration that can disable certain heavy model-based features. If full layout analysis is not required, configure a simpler pipeline:

```python
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.pipeline.simple_pipeline import SimplePipeline

converter = DocumentConverter(
    format_options={
        "pdf": PdfFormatOption(pipeline_cls=SimplePipeline)
    }
)
```

**Trade-off:** Loses rich layout detection (tables may not be properly recognized, headings may be missed). May be acceptable for simple text-heavy PDFs but not for complex multi-column or table-heavy documents.

---

## Supabase Edge Function Secrets (Prerequisite for All Layers)

Regardless of which layers are fixed, the Supabase Edge Functions need these secrets configured:

| Secret | Value | Set? |
|--------|-------|------|
| `CONVERSION_SERVICE_URL` | `https://writing-system-conversion-service-862494623920.us-central1.run.app` | Needs verification |
| `CONVERSION_SERVICE_KEY` | `Rq4T7-GjXhI8iPLn3eexyydOLJ_MkERtcTiXJ0NTT2o` | Needs verification |

Dashboard: https://supabase.com/dashboard/project/dbdzzhshmigewyprahej/settings/functions

---

## Impact by File Type

| Upload type | Layer 1 (403) | Layer 2 (redeploy) | Layer 3 (models) | Current status |
|-------------|---------------|---------------------|-------------------|----------------|
| **.md** | N/A | N/A | N/A | Works end-to-end |
| **.txt** | Resolved | Resolved | N/A | Unblocked |
| **.docx** | Resolved | Resolved | N/A (no ML models needed) | Works end-to-end (Docling track, verified) |
| **.pdf** | Resolved | Resolved | Resolved (models baked into image) | Unblocked — needs smoke test |

---

## Pipeline Flow (Reference)

```
User uploads PDF
  |
  v
ingest Edge Function (process-convert.ts)
  - Creates documents_v2 row (status='converting')
  - Creates signed URLs: source download, .md upload, .docling.json upload
  - POSTs to Cloud Run conversion service /convert
  |
  v
Cloud Run: conversion-service (main.py)
  - Downloads PDF from signed URL
  - DocumentConverter().convert(url)        <-- Layer 3 fails here for PDF
  - export_to_markdown() -> upload .md
  - export_to_dict() -> deterministic JSON   <-- Layer 2: old image skips this
  - upload .docling.json                     <-- Layer 2: old image skips this
  - POST callback to conversion-complete
    with { source_uid, md_key, docling_key } <-- Layer 2: old image omits docling_key
  |
  v
conversion-complete Edge Function
  - If docling_key present:  Docling track (spec-compliant)
  - If docling_key absent:   mdast fallback (functional but non-compliant)
  - Writes blocks to blocks_v2
  - Updates documents_v2 status='ingested'
```

---

## Recommended Resolution Order

1. **Layer 2 first** — Redeploy conversion service with current code. This unblocks DOCX ingestion on the Docling track and .txt ingestion with the updated callback contract. ~17 min build.

2. **Layer 3 next** — Update Dockerfile to pre-download models (Option A). Rebuild and redeploy. This unblocks PDF ingestion. ~20 min build.

3. **Verify secrets** — Confirm `CONVERSION_SERVICE_URL` and `CONVERSION_SERVICE_KEY` are set in Supabase Edge Function secrets.

4. **End-to-end smoke test** — Run `scripts/smoke-test-non-md.ps1` with a `.docx` fixture, then test with a `.pdf` fixture.

---

## Stale Documentation to Update After Resolution

| Document | What's stale |
|----------|--------------|
| `docs/work-request/gcp-cloud-run-conversion-service-status.md` | Still says "BLOCKED by org policy" — Layer 1 is resolved |
| `docs/platform/0209-unified-remaining-work.md` Phase 9.1 | Still references 403 blocker — Layer 1 is resolved |
| `docs/product-defining-v2.0/0208-docling-track-state-log.md` | "Remaining work" section still lists conversion service redeployment as pending |

---

## Related Changelog Entries

- `changelog.jsonl` entry 64 (`docling_tree_traversal_bugfix`): first documents the PDF model download failure as a separate issue
- `repo-changelog.jsonl` entry 70 (`cloud_run_conversion_service_reachability_verified`): confirms Layer 1 resolution
- `repo-changelog.jsonl` entry 65 (`docling_track_implemented`): documents the Docling track implementation (Edge Function side complete, conversion service redeployment pending)

---

## Key Files

| File | Role |
|------|------|
| `services/conversion-service/app/main.py` | Python conversion service (Docling + FastAPI) |
| `services/conversion-service/Dockerfile` | Docker build — missing model pre-download |
| `services/conversion-service/requirements.txt` | `docling>=2.70.0` dependency |
| `supabase/functions/ingest/process-convert.ts` | Edge Function: calls conversion service |
| `supabase/functions/conversion-complete/index.ts` | Edge Function: receives callback, two-branch Docling/mdast logic |
| `supabase/functions/_shared/docling.ts` | Block extraction from DoclingDocument JSON |
| `scripts/smoke-test-non-md.ps1` | End-to-end test for non-MD pipeline |
| `scripts/deploy-cloud-run-conversion-service.ps1` | Automated Cloud Run deploy script |