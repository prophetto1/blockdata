# Plan: Pandoc Parsing Service (Counterpart to Docling)

## Context

The writing-system has a Docling-based conversion pipeline on Cloud Run (`blockdata-platform-api`). Pandoc handles markup formats Docling can't (RST, Org, EPUB, ODT, Typst, MediaWiki, etc.). The config schema, seed profiles, and architecture docs already exist — but nothing is deployed. This plan stands up a pandoc conversion service mirroring the Docling pattern, deployed via `gcloud` CLI.

---

## Architecture Decision: Thin FastAPI wrapper (not raw pandoc-server)

**Why not use pandoc-server directly?** The Docling service uses a specific request contract: `ConvertRequest` with `source_uid`, signed URLs, `callback_url`, `pipeline_config`. The pandoc-server API doesn't understand any of that — it just takes `text` + options and returns converted output.

**Approach:** A thin Python (FastAPI) service that:
1. Accepts the same `ConvertRequest` contract as the Docling service
2. Downloads the source file from the signed URL
3. Calls the pandoc CLI (or pandoc-server locally) with translated config
4. Uploads outputs to signed URLs
5. POSTs the callback to `conversion-complete`

This mirrors the Docling platform-api exactly — same auth, same models, same callback flow.

---

## Implementation Steps

### Step 1: Create `services/pandoc-service/` directory

New files:

**`services/pandoc-service/Dockerfile`**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends pandoc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -U pip && \
    pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**`services/pandoc-service/requirements.txt`**
```
fastapi>=0.111
uvicorn[standard]>=0.30
httpx>=0.27
pydantic>=2.7
```

**`services/pandoc-service/app/main.py`**
- FastAPI app with `/convert` and `/health` routes
- Same auth pattern: `X-Conversion-Service-Key` header validation
- Lifespan: verify `pandoc --version` on startup

**`services/pandoc-service/app/domain/conversion/models.py`**
- Reuse same `ConvertRequest`, `OutputTarget` Pydantic models
- Add `track` pattern: `^(pandoc)$`
- Add pandoc-specific source types to `source_type` pattern

**`services/pandoc-service/app/domain/conversion/service.py`**
- `convert(req: ConvertRequest)` → downloads source, runs pandoc, returns outputs
- `build_pandoc_args(pipeline_config, input_path)` → translates jsonb config to CLI args
  (Logic already designed in `docs/pipeline/2026-03-10-parsing-pipeline-pandoc.md` §4)
- Default output: `--to json` (pandoc AST JSON) + `--to markdown` (for md output)
- Returns: `(markdown_bytes, pandoc_json_bytes, html_bytes, None)`

**`services/pandoc-service/app/domain/conversion/callbacks.py`**
- `send_conversion_callback()` — same as platform-api's version
- POST to callback_url with success/error payload

**`services/pandoc-service/app/infra/http_client.py`**
- `download_bytes()`, `upload_bytes()`, `append_token_if_needed()`
- Copy from platform-api (same httpx helpers)

### Step 2: Conv_uid hash for pandoc

Mirror the Docling pattern but with pandoc-specific prefix:
```python
def build_pandoc_conv_uid(pandoc_json_bytes: bytes) -> str:
    digest = hashlib.sha256()
    digest.update(b"pandoc\npandoc_ast_json\n")
    digest.update(pandoc_json_bytes)
    return digest.hexdigest()
```

### Step 3: Deploy script `scripts/deploy-cloud-run-pandoc-service.ps1`

Mirror `deploy-cloud-run-platform-api.ps1` with these differences:

| Parameter | Value |
|-----------|-------|
| `$ServiceName` | `blockdata-pandoc-service` |
| `$ServiceAccountName` | `blockdata-pandoc-sa` |
| `$Port` | `8000` |
| `$Cpu` | `1` |
| `$Memory` | `512Mi` |
| `$Concurrency` | `20` (pandoc is fast, can handle more) |
| `$TimeoutSeconds` | `300` (5 min, generous) |

Secrets: Same `platform-api-m2m-token` secret (shared auth key). No Supabase service role key needed (pandoc service only uploads to signed URLs and calls back).

Env vars: `CONVERSION_SERVICE_KEY` only.

### Step 4: Update `trigger-parse` edge function

Currently `CONVERSION_SERVICE_URL` points to the Docling platform-api. For pandoc track, we need a second URL.

Changes to `supabase/functions/trigger-parse/index.ts`:
- Add env var: `PANDOC_SERVICE_URL`
- After resolving `track`, select service URL:
  ```typescript
  const serviceUrl = track === "pandoc"
    ? requireEnv("PANDOC_SERVICE_URL")
    : requireEnv("CONVERSION_SERVICE_URL");
  ```
- For pandoc track, create signed upload for `.pandoc.json` (AST) instead of `.docling.json`
- Set `conv_parsing_tool: "pandoc"` in pre-insert
- Skip doctags output for pandoc track (not applicable)

### Step 5: Update `conversion-complete` edge function

Changes to `supabase/functions/conversion-complete/index.ts`:
- Accept `track: "pandoc"` in addition to `"docling"`
- For pandoc track:
  - Use `pandoc_key` field (instead of `docling_key`) for the AST JSON artifact
  - `conv_representation_type: "pandoc_ast_json"`
  - Conv_uid prefix: `pandoc\npandoc_ast_json\n`
  - Block extraction: parse pandoc AST JSON blocks (different structure than Docling)

### Step 6: Update runtime policy

Add pandoc track routing in the `admin_runtime_policy` table:
- `extension_track_routing`: map pandoc-exclusive formats to `"pandoc"` track
  - `rst`, `org`, `epub`, `odt`, `rtf`, `typst` → `"pandoc"`
  - Overlap formats (`docx`, `html`, `md`, `latex`) stay on `"docling"` by default
- `track_enabled`: add `"pandoc": true`
- `parser_artifact_source_types`: add `"pandoc": [list of pandoc source types]`

This is a data change (SQL migration or direct update), not code.

---

## Critical Files

| File | Action |
|------|--------|
| `services/pandoc-service/` (new dir) | Create: Dockerfile, requirements.txt, app/ |
| `scripts/deploy-cloud-run-pandoc-service.ps1` | Create: mirror platform-api deploy script |
| `supabase/functions/trigger-parse/index.ts` | Edit: add PANDOC_SERVICE_URL routing |
| `supabase/functions/conversion-complete/index.ts` | Edit: handle pandoc track callbacks |
| `docs/pipeline/2026-03-10-parsing-pipeline-pandoc.md` | Reference: config→CLI translation logic |

## Reusable Code

- `buildPandocArgs()` — already designed in `docs/pipeline/2026-03-10-parsing-pipeline-pandoc.md` §4
- `OutputTarget`, callback pattern — copy from `services/platform-api/app/domain/conversion/models.py`
- `upload_bytes()`, `download_bytes()` — copy from `services/platform-api/app/infra/http_client.py`
- Deploy script helpers — copy from `scripts/deploy-cloud-run-platform-api.ps1`
- Seed profiles — already in migration `076_pandoc_parsing_profiles.sql`

---

## Verification

1. **Local:** `docker build` + `docker run` the pandoc service, POST a test RST file to `/convert`
2. **Health check:** `GET /health` returns pandoc version
3. **Deploy:** Run `deploy-cloud-run-pandoc-service.ps1`, verify Cloud Run URL responds
4. **Integration:** Upload an RST file through the UI, verify it routes to pandoc service, callback succeeds, blocks appear in DB
5. **Edge cases:** Test EPUB (binary input via base64), LaTeX with citations, large Org-mode files
