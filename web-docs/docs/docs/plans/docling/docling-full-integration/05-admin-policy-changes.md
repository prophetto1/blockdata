# Admin Runtime Policy Changes

**Table:** `admin_runtime_policy`
**Edge function:** `admin-config/index.ts`
**Current keys:** 23 policy keys controlling ingest routing, worker config, LLM defaults

---

## New Policy Keys

### 1. `upload.docling_profile`

| Attribute | Value |
|---|---|
| `policy_key` | `upload.docling_profile` |
| `value_type` | `string` |
| `default` | `"docling_pdf_balanced_default"` |
| `description` | Quality tier for Docling PDF conversions. Controls OCR, table structure, layout model, and enricher defaults. |

**Valid values:**

| Profile | Description | Use case |
|---|---|---|
| `docling_pdf_fast_deterministic` | OCR disabled, no table structure, no enrichers. Fastest. Lowest quality. | Quick previews, text-only PDFs |
| `docling_pdf_balanced_default` | OCR + table structure enabled. No code/formula/picture enrichers. | Default for most documents |
| `docling_pdf_high_recall_layout_semantic` | All features enabled. Best layout model. Code + formula detection. | High-value documents, scanned PDFs |
| `docling_simple_picture_aware` | Picture enrichers only. For non-paginated formats (DOCX, HTML, etc.). | Office documents with images |
| `docling_audio_asr_default` | ASR-specific config. For audio files. | Audio transcription (future) |

**Runtime behavior:** Forwarded from `ingest/process-convert.ts` to conversion service in the `/convert` request body as `profile` field.

---

### 2. `upload.docling_enrichers`

| Attribute | Value |
|---|---|
| `policy_key` | `upload.docling_enrichers` |
| `value_type` | `object` |
| `default` | See below |
| `description` | Fine-grained enricher toggles. Overrides within the selected profile. |

**Default value:**
```json
{
  "do_ocr": true,
  "do_table_structure": true,
  "do_code_enrichment": false,
  "do_formula_enrichment": false,
  "do_picture_classification": false,
  "do_picture_description": false,
  "picture_description_mode": null,
  "layout_model": null,
  "table_structure_mode": null
}
```

**Field reference:**

| Field | Type | Default | Description |
|---|---|---|---|
| `do_ocr` | boolean | `true` | Run OCR on PDF pages. Only applies to StandardPdfPipeline (pdf, image, mets_gbs). |
| `do_table_structure` | boolean | `true` | Run TableFormer table extraction. Only applies to StandardPdfPipeline. |
| `do_code_enrichment` | boolean | `false` | Detect and label code blocks. Requires models in Docker image. |
| `do_formula_enrichment` | boolean | `false` | Detect and enrich mathematical formulas. Requires models in Docker image. |
| `do_picture_classification` | boolean | `false` | Classify pictures into categories (diagram, chart, photo, etc.). |
| `do_picture_description` | boolean | `false` | Generate textual descriptions of images. Requires API endpoint or local VLM. |
| `picture_description_mode` | string\|null | `null` | `"api"` (OpenAI-compatible endpoint) or `"vlm_local"` (local HuggingFace model). Only relevant when `do_picture_description=true`. |
| `layout_model` | string\|null | `null` | Layout model override: `"DOCLING_LAYOUT_HERON"` (fast), `"DOCLING_LAYOUT_EGRET_MEDIUM"`, `"DOCLING_LAYOUT_EGRET_LARGE"`, `"DOCLING_LAYOUT_EGRET_XLARGE"` (best). NULL = use profile default. |
| `table_structure_mode` | string\|null | `null` | `"FAST"` or `"ACCURATE"`. NULL = use profile default (ACCURATE). |

**Runtime behavior:** Forwarded from `ingest/process-convert.ts` to conversion service in the `/convert` request body as `enricher_config` field. The conversion service resolves these into Docling `PipelineOptions`.

---

### 3. `upload.docling_picture_description_api_url`

| Attribute | Value |
|---|---|
| `policy_key` | `upload.docling_picture_description_api_url` |
| `value_type` | `string` |
| `default` | `null` |
| `description` | OpenAI-compatible API endpoint for picture description. Only used when `do_picture_description=true` and `picture_description_mode="api"`. |

**Example:** `"https://api.openai.com/v1/chat/completions"` or a Vertex AI endpoint.

This is stored as a policy key rather than an environment variable because:
1. It may change without redeploying the conversion service
2. Different deployments might use different providers
3. The admin can toggle it on/off without Docker rebuilds

The conversion service reads this from the request body (forwarded by the edge function) and passes it to Docling's `PictureDescriptionApiOptions.url`.

---

## SQL to Insert Default Policy Keys

```sql
-- Profile selection
INSERT INTO admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES (
  'upload.docling_profile',
  '"docling_pdf_balanced_default"',
  'string',
  'Quality tier for Docling PDF conversions: docling_pdf_fast_deterministic, docling_pdf_balanced_default, docling_pdf_high_recall_layout_semantic, docling_simple_picture_aware, docling_audio_asr_default'
) ON CONFLICT (policy_key) DO NOTHING;

-- Enricher toggles
INSERT INTO admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES (
  'upload.docling_enrichers',
  '{"do_ocr":true,"do_table_structure":true,"do_code_enrichment":false,"do_formula_enrichment":false,"do_picture_classification":false,"do_picture_description":false,"picture_description_mode":null,"layout_model":null,"table_structure_mode":null}',
  'object',
  'Fine-grained Docling enricher toggles. Overrides within the selected profile.'
) ON CONFLICT (policy_key) DO NOTHING;

-- Picture description API URL
INSERT INTO admin_runtime_policy (policy_key, value_jsonb, value_type, description)
VALUES (
  'upload.docling_picture_description_api_url',
  'null',
  'string',
  'OpenAI-compatible API endpoint for Docling picture description. Only used when do_picture_description=true and picture_description_mode=api.'
) ON CONFLICT (policy_key) DO NOTHING;
```

---

## Interaction with Existing Policy Keys

### Existing keys that affect conversion routing

| Key | Current role | Interaction with new keys |
|---|---|---|
| `upload.track_enabled` | Master toggle for conversion tracks | No change. Must be `true` for any conversion to happen. |
| `upload.extension_track_routing` | Maps file extensions → tracks (mdast/docling/pandoc) | No change. Determines which track runs. Profile/enrichers only apply when track=docling. |
| `upload.parser_artifact_source_types.docling` | Which source types get DoclingDocument JSON artifact | No change. Controls whether `docling_output` signed URL is provisioned. |
| `upload.parser_artifact_source_types.pandoc` | Which source types get Pandoc AST JSON artifact | No change. |

### Precedence chain

```
1. upload.extension_track_routing  →  Determines: track (mdast/docling/pandoc)
2. upload.parser_artifact_source_types  →  Determines: which supplemental artifacts
3. upload.docling_profile  →  Determines: quality tier (only if track=docling)
4. upload.docling_enrichers  →  Determines: enricher overrides within profile
5. upload.docling_picture_description_api_url  →  Determines: API endpoint for pictures
```

---

## Superuser Admin Page Updates

The admin config page (`web/src/pages/AdminConfig.tsx` or equivalent) needs:

1. **Profile selector:** Dropdown with 5 profile options
2. **Enricher toggles:** Checkboxes for each enricher flag
3. **Layout model selector:** Dropdown (null/Heron/Egret variants)
4. **Table mode selector:** Dropdown (null/FAST/ACCURATE)
5. **Picture description API URL:** Text input (only visible when picture_description enabled)

These are read/write via the existing `admin-config` edge function — no new endpoints needed.
