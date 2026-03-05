
# Output A Companion: Docling 2.1-2.3 Exhaustive Analysis

Date: 2026-02-17
Scope: Docling reference repo only (`E:\writing-system\ref-repos\docling`)
Status: Exhaustive analysis draft for immediate implementation planning
Integration contracts: Section 13 (provenance, block fields, format resolution, profiles, hash strategy, current-vs-target delta)
Consolidated supertables: Appendix H (keyed by InputFormat, at end of document)



##

docling/
├── document_converter.py          # Entry point — format routing, pipeline selection
├── document_extractor.py          # Structured extraction (NuExtract)
├── exceptions.py
│
├── backend/                       # One backend per input format
│   ├── abstract_backend.py        # Base classes (Paginated vs Declarative)
│   ├── docling_parse_v4_backend.py  # PDF (via docling-parse)
│   ├── pypdfium2_backend.py       # PDF alt backend
│   ├── image_backend.py           # IMAGE → paginated
│   ├── msword_backend.py          # DOCX (75KB — largest backend)
│   ├── mspowerpoint_backend.py    # PPTX
│   ├── msexcel_backend.py         # XLSX
│   ├── html_backend.py            # HTML (59KB)
│   ├── md_backend.py              # Markdown
│   ├── csv_backend.py             # CSV
│   ├── asciidoc_backend.py        # AsciiDoc
│   ├── mets_gbs_backend.py        # METS/GBS archives
│   ├── webvtt_backend.py          # VTT captions
│   ├── noop_backend.py            # Audio (no-op, ASR handles)
│   ├── docx/                      # DOCX sub-modules
│   ├── xml/                       # USPTO + JATS XML backends
│   └── json/                      # Docling JSON re-import
│
├── datamodel/                     # All type definitions + options
│   ├── base_models.py             # InputFormat enum, QualityGrade, BoundingBox
│   ├── document.py                # DoclingDocument construction helpers
│   ├── pipeline_options.py        # 43KB — ALL pipeline/enricher option classes
│   ├── pipeline_options_vlm_model.py  # VLM-specific options
│   ├── pipeline_options_asr_model.py  # ASR-specific options
│   ├── backend_options.py         # PDF backend selection options
│   ├── accelerator_options.py     # CPU/CUDA/MPS device selection
│   ├── layout_model_specs.py      # Layout model configs (Heron, Egret variants)
│   ├── vlm_model_specs.py         # VLM model configs
│   ├── asr_model_specs.py         # ASR/Whisper model configs
│   ├── extraction.py              # Extraction schema types
│   └── settings.py                # Global settings
│
├── pipeline/                      # Pipeline orchestration
│   ├── base_pipeline.py           # Abstract base
│   ├── simple_pipeline.py         # For declarative backends (DOCX, HTML, etc.)
│   ├── standard_pdf_pipeline.py   # Full PDF pipeline (37KB)
│   ├── legacy_standard_pdf_pipeline.py  # Older synchronous variant
│   ├── threaded_standard_pdf_pipeline.py  # Production threaded variant
│   ├── vlm_pipeline.py            # Vision-Language Model pipeline
│   ├── asr_pipeline.py            # Audio/Speech pipeline
│   └── extraction_vlm_pipeline.py # Structured extraction via VLM
│
├── models/                        # ML model wrappers
│   ├── stages/
│   │   ├── ocr/                   # 6 OCR engines (rapid, easy, tesseract×2, mac, auto)
│   │   ├── layout/                # Layout detection model
│   │   ├── table_structure/       # TableFormer (FAST/ACCURATE)
│   │   ├── code_formula/          # Code + formula enrichment
│   │   ├── picture_classifier/    # Picture type classification
│   │   ├── picture_description/   # API + VLM description generators
│   │   ├── page_preprocessing/    # Image scaling/prep
│   │   ├── page_assemble/         # Page → DoclingDocument assembly
│   │   └── reading_order/         # Reading order detection
│   ├── vlm_pipeline_models/       # VLM inference (transformers, MLX, vLLM, API)
│   ├── extraction/                # NuExtract structured extraction
│   ├── factories/                 # Model factory pattern (OCR, layout, table, etc.)
│   └── plugins/                   # Plugin defaults
│
├── chunking/                      # Chunking strategies (re-exports from docling-core)
├── utils/                         # Layout postprocessing, visualization, OCR utils
├── cli/                           # CLI entry point (main.py = 41KB)
└── experimental/                  # Experimental pipeline/model extensions

## Completion Gate Statements

1. Statement 1 (exhaustive, repo-validated analysis of 2.1, 2.2, 2.3): **TRUE**.
2. Statement 2 (mission-critical quality standard understood and reflected): **TRUE**.

## How This Analysis Was Executed

This deliverable is intentionally Docling-only and evidence-led.

Analysis method:

1. Enumerated supported formats from source enums and format maps.
2. Traced default format -> format option -> pipeline -> backend mapping from `document_converter.py`.
3. Traced pipeline construction and model toggles in `base_pipeline.py`, `standard_pdf_pipeline.py`, `simple_pipeline.py`, `asr_pipeline.py`.
4. Traced extender option classes and defaults in `pipeline_options.py`.
5. Traced runtime dependency constraints from OCR/picture/asr model sources.
6. Built empirical label/group matrices from `tests/data/groundtruth/docling_v2/*.json`.
7. Cross-checked conceptual docs (`supported_formats.md`, `enrichments.md`, `advanced_options.md`, `docling_document.md`, `architecture.md`).

Scope boundary:

1. This analysis reports Docling capabilities and behavior from the checked source tree.
2. It does not claim behavior for libraries outside this tree (`docling_core` internals are referenced where exposed through this repo).
3. Empirical type-by-format coverage is based on groundtruth corpus files present in this repo snapshot.

## Source Files Read for 2.1-2.3

| Primary Contract Files (19) | Backends Examined (13) | Concept Docs & Corpus (8) |
|---|---|---|
| `datamodel/base_models.py` | `backend/asciidoc_backend.py` | `docs/usage/supported_formats.md` |
| `document_converter.py` | `backend/csv_backend.py` | `docs/usage/enrichments.md` |
| `datamodel/pipeline_options.py` | `backend/html_backend.py` | `docs/usage/advanced_options.md` |
| `pipeline/base_pipeline.py` | `backend/image_backend.py` | `docs/concepts/docling_document.md` |
| `pipeline/standard_pdf_pipeline.py` | `backend/md_backend.py` | `docs/concepts/architecture.md` |
| `pipeline/simple_pipeline.py` | `backend/mets_gbs_backend.py` | `docs/reference/docling_document.md` |
| `pipeline/asr_pipeline.py` | `backend/msexcel_backend.py` | `docs/reference/pipeline_options.md` |
| `models/plugins/defaults.py` | `backend/mspowerpoint_backend.py` | `tests/data/groundtruth/docling_v2/*.json` |
| `models/stages/ocr/auto_ocr_model.py` | `backend/msword_backend.py` | |
| `models/stages/ocr/easyocr_model.py` | `backend/webvtt_backend.py` | |
| `models/stages/ocr/rapid_ocr_model.py` | `backend/xml/jats_backend.py` | |
| `models/stages/ocr/tesseract_ocr_cli_model.py` | `backend/xml/uspto_backend.py` | |
| `models/stages/ocr/tesseract_ocr_model.py` | `backend/json/docling_json_backend.py` | |
| `models/stages/ocr/ocr_mac_model.py` | | |
| `models/stages/picture_description/picture_description_api_model.py` | | |
| `models/stages/picture_description/picture_description_vlm_model.py` | | |
| `models/stages/picture_classifier/document_picture_classifier.py` | | |
| `models/vlm_pipeline_models/api_vlm_model.py` | | |
| `models/stages/code_formula/code_formula_model.py` | | |

All paths relative to `ref-repos/docling/docling/` (contract files and backends) or `ref-repos/docling/` (docs and tests).

## 1) Class Taxonomy by Architectural Level (Router -> Pipeline -> Backend -> Stages -> Output)

This chapter disambiguates Docling "class families" by architectural layer. Similar names appear across files, but their runtime responsibilities are different and must be kept separate in platform design.

### 1.1 Routing Layer (Format detection + conversion wiring)

Purpose: detect `InputFormat` and wire the conversion contract.

- `_DocumentConversionInput._guess_format()` in `datamodel/document.py` performs extension/MIME-based format detection.
- `DocumentConverter` in `document_converter.py` wires:
  1. format -> pipeline class
  2. format -> backend class
  3. format -> option classes (pipeline options + backend options)

Critical boundary:
- Routing does not run OCR/layout/table models and does not parse pages itself.
- Routing decides what will run; pipeline and backend execute it.

### 1.2 Pipeline Layer (Execution strategy + orchestration)

Purpose: define runtime execution flow and orchestration.

Base hierarchy (source-accurate):
- `BasePipeline`
  - `ConvertPipeline`
    - `SimplePipeline`
    - `PaginatedPipeline`
      - `StandardPdfPipeline`
      - `LegacyStandardPdfPipeline`
      - `VlmPipeline`
  - `AsrPipeline` (inherits directly from `BasePipeline`, not from `ConvertPipeline`)

Pipeline family behavior:
1. `SimplePipeline`: one-shot declarative backend conversion; no page-model stages.
2. `StandardPdfPipeline`: paginated staged flow (page preprocessing, OCR, layout, table structure, assembly, reading order, enrichments).
3. `AsrPipeline`: speech/audio transcription-oriented pipeline path.
4. `VlmPipeline`: paginated VLM interpretation path (alternative strategy, explicit/non-default in standard format routing).

### 1.3 Backend Layer (Format-specific parsing contracts)

Purpose: parse source format into Docling structures according to backend contract.

Contract split:
1. Declarative backends
- Return a complete `DoclingDocument` from backend `convert()`.
- Used by `SimplePipeline` input formats.
2. Paginated/document backends
- Provide page-oriented access used by paginated pipelines (`StandardPdfPipeline`, `VlmPipeline`).
- Used for PDF-family/image-like processing paths.

Critical boundary:
- Backends parse format-specific content.
- Backends do not define global orchestration order of model stages.

### 1.4 Stage Model Layer (Page intelligence modules)

Purpose: page-level prediction/assembly modules used by paginated pipelines.

Primary stage families:
- OCR engines (auto + explicit engines)
- Layout analysis
- Table structure recognition
- Page assembly / reading-order postprocessing

Scope boundary:
- These are pipeline-dependent modules (primarily paginated flows), not universal for all formats.

### 1.5 Enricher Layer (Post-assembly semantic augmentation)

Purpose: enrich assembled `DoclingDocument` items with additional semantics/metadata.

Enrichment realities in source:
- `ConvertPipeline` defines picture enrichers (classification + description), gated by options.
- `StandardPdfPipeline` prepends code/formula enrichment and then applies picture enrichers.
- `VlmPipeline` defines its own enrichment pipe (currently set to empty in this repo snapshot).
- `AsrPipeline` has its own flow and is not part of `ConvertPipeline` enrichment chain.

Critical boundary:
- Enrichers operate on built document items (for example `PictureItem.meta`), not on raw source bytes.

### 1.6 Options Layer (Typed configuration surface)

Purpose: typed controls for runtime behavior.

Options categories:
1. Pipeline options (orchestration/stages)
- Examples: `ConvertPipelineOptions`, `PdfPipelineOptions`, `AsrPipelineOptions`, `VlmPipelineOptions`.
- Controls stage toggles, timeouts, acceleration, enrichment gates, and related runtime behavior.
2. Backend options (format parser behavior)
- Examples: `PdfBackendOptions`, `HTMLBackendOptions`, `MarkdownBackendOptions`, `MsExcelBackendOptions`.
- Controls parser-specific behavior (passwords, image fetching, singleton-table handling).

Rule:
- If it changes parser behavior for a source format, it belongs in backend options.
- If it changes stage execution or orchestration, it belongs in pipeline options.

### 1.7 Output Model Layer (Canonical artifacts)

Purpose: define persisted/portable conversion artifacts.

Primary artifacts:
1. `DoclingDocument` (from `docling_core` types)
- Canonical structural artifact (items, structure trees, provenance, origin data).
2. `ConversionResult` (Docling wrapper in `datamodel/document.py`)
- Conversion status, errors, timings, confidence, pages/intermediate assets, and references to document output.

Critical boundary:
- Output models are data contracts, not execution logic.
- Treat these as first-class persistence/provenance artifacts in schema design.

## 2) Parsing Pipelines - Default/General by Input Type

## 2.1.1 Default Mapping: Input Type -> Pipeline -> Backend -> Options

Docling routes each file automatically: the file's extension/MIME determines the `InputFormat`, which selects exactly one pipeline (processing strategy) and one backend (format parser). This chain is hardcoded in `document_converter.py`. The only part a user can configure is the options — pipeline options control orchestration (OCR, layout, table structure) and backend options control parser behavior (passwords, image fetching). All options have sensible defaults.

| InputFormat | Pipeline | Pipeline Options | Backend Class | Backend Options | Key Backend Options |
|---|---|---|---|---|---|
| `pdf` | `StandardPdfPipeline` | `PdfPipelineOptions` | `DoclingParseV4DocumentBackend` | `PdfBackendOptions` | `password` (optional SecretStr) |
| `image` | `StandardPdfPipeline` | `PdfPipelineOptions` | `ImageDocumentBackend` | — | — |
| `mets_gbs` | `StandardPdfPipeline` | `PdfPipelineOptions` | `MetsGbsDocumentBackend` | — | — |
| `docx` | `SimplePipeline` | `ConvertPipelineOptions` | `MsWordDocumentBackend` | `DeclarativeBackendOptions` | — |
| `pptx` | `SimplePipeline` | `ConvertPipelineOptions` | `MsPowerpointDocumentBackend` | `DeclarativeBackendOptions` | — |
| `xlsx` | `SimplePipeline` | `ConvertPipelineOptions` | `MsExcelDocumentBackend` | `MsExcelBackendOptions` | `treat_singleton_as_text` (default False) |
| `html` | `SimplePipeline` | `ConvertPipelineOptions` | `HTMLDocumentBackend` | `HTMLBackendOptions` | `fetch_images` (False), `source_uri` (None), `add_title` (True), `infer_furniture` (True) |
| `md` | `SimplePipeline` | `ConvertPipelineOptions` | `MarkdownDocumentBackend` | `MarkdownBackendOptions` | `fetch_images` (False), `source_uri` (None) |
| `csv` | `SimplePipeline` | `ConvertPipelineOptions` | `CsvDocumentBackend` | `DeclarativeBackendOptions` | — |
| `asciidoc` | `SimplePipeline` | `ConvertPipelineOptions` | `AsciiDocBackend` | `DeclarativeBackendOptions` | — |
| `xml_uspto` | `SimplePipeline` | `ConvertPipelineOptions` | `PatentUsptoDocumentBackend` | `DeclarativeBackendOptions` | — |
| `xml_jats` | `SimplePipeline` | `ConvertPipelineOptions` | `JatsDocumentBackend` | `DeclarativeBackendOptions` | — |
| `json_docling` | `SimplePipeline` | `ConvertPipelineOptions` | `DoclingJSONBackend` | `DeclarativeBackendOptions` | — |
| `vtt` | `SimplePipeline` | `ConvertPipelineOptions` | `WebVTTDocumentBackend` | `DeclarativeBackendOptions` | — |
| `audio` | `AsrPipeline` | `AsrPipelineOptions` | `NoOpBackend` | — | — |

All backend options inherit from `BaseBackendOptions` which provides `enable_remote_fetch` (default False) and `enable_local_fetch` (default False).
Rows grouped by pipeline family: StandardPdfPipeline (3), SimplePipeline (11), AsrPipeline (1).

## 2.1.2 What "General Default Parsing Execution" Actually Means in Runtime

### A) For `SimplePipeline` formats

Options class: `ConvertPipelineOptions` (extends `PipelineOptions`).
Source: `pipeline/simple_pipeline.py` (class `SimplePipeline`, extends `ConvertPipeline`).

SimplePipeline is a single-call conversion: the backend produces a complete `DoclingDocument` in one step, with no page-level model stages. All intelligence lives in the backend, not in the pipeline.

#### Build phase — backend `convert()` (one call)

The backend must implement `DeclarativeDocumentBackend`. SimplePipeline calls `conv_res.input._backend.convert()` which returns a fully-formed `DoclingDocument`. There is no page iteration, no layout detection, no OCR, no table structure recognition. See the 11 SimplePipeline rows in 2.1.1 for format → backend → options mapping.

#### Assembly phase — no-op

SimplePipeline does not override `_assemble_document()`. The base class implementation returns `conv_res` unchanged. There is no paginated assembly, no reading order reordering, no layout cluster merging.

#### Enrichment phase — picture enrichers only

Inherited from `ConvertPipeline.__init__()`, SimplePipeline receives exactly two enrichment models:

1. **Picture Classification** — `DocumentPictureClassifier` (conditional: `do_picture_classification`, default **False**)
   - Options class: `DocumentPictureClassifierOptions`.
   - Attaches `PictureItem.meta.classification` with `{predictions: [{class_name, confidence, created_by}]}`.

2. **Picture Description** — factory-created via `get_picture_description_factory()` (conditional: `do_picture_description`, default **False**)
   - Options class: `PictureDescriptionApiOptions` (remote) or `PictureDescriptionVlmOptions` (local VLM).
   - Default model: SmolVLM (`smolvlm_picture_description`).
   - Attaches `PictureItem.meta.description` with `{text, created_by}`.

#### Status determination

SimplePipeline always returns `ConversionStatus.SUCCESS` if no exception was raised. There is no partial-success path — either the backend `convert()` completes or the entire conversion fails.

#### What SimplePipeline does NOT have (vs StandardPdfPipeline)

- No page preprocessing or image rendering.
- No OCR (text comes from the backend's own parser: python-docx, BeautifulSoup, etc.).
- No layout analysis model — the backend decides what is a heading, table, paragraph, etc.
- No table structure recognition — the backend parses tables directly from the source format.
- No code/formula enrichment.
- No reading order model.
- No threading or backpressure — single-threaded, single `convert()` call.
- No `generate_page_images` / `generate_picture_images` / `generate_parsed_pages` options.
- No page-level timeout — only the pipeline-level `document_timeout` from `PipelineOptions` applies.

### B) For `StandardPdfPipeline` formats

Options class: `PdfPipelineOptions` (extends `PaginatedPipelineOptions`).
Source: `pipeline/standard_pdf_pipeline.py` (class `StandardPdfPipeline`, extends `ConvertPipeline`).

Execution is a multi-threaded pipeline of stages connected by bounded queues with backpressure. Pages flow through stages in order; enrichment runs after all pages are assembled.

#### Page-level stages (threaded, per-page)

1. **Page Preprocessing** — `PagePreprocessingModel` (always runs)
   - Loads page backend, renders page image at `images_scale` resolution, extracts raw text cells from PDF backend.

2. **OCR** — factory-created via `get_ocr_factory()` (conditional: `do_ocr`, default **True**)
   - Options class: `OcrOptions` base; default is `OcrAutoOptions` which auto-selects the best available engine.
   - Auto-selection order (from `auto_ocr_model.py`): `ocrmac` (macOS) → `RapidOcr` → `EasyOcr` → `TesseractOcr` → `TesseractCliOcr`.
   - Engine option classes: `OcrMacOptions`, `RapidOcrOptions`, `EasyOcrOptions`, `TesseractOcrOptions`, `TesseractCliOcrOptions`.
   - Batch size: `ocr_batch_size` (default 4).

3. **Layout Analysis** — factory-created via `get_layout_factory()` (always runs)
   - Options class: `LayoutOptions` (default model spec: Heron).
   - Output: `LayoutPrediction` — list of `Cluster` objects, each with `label` (DocItemLabel), `bbox`, `confidence` (float), `cells` (text cells assigned to cluster).
   - Batch size: `layout_batch_size` (default 4).

4. **Table Structure** — factory-created via `get_table_structure_factory()` (conditional: `do_table_structure`, default **True**)
   - Options class: `TableStructureOptions` (default mode: `ACCURATE`).
   - Output: `TableStructurePrediction` — cell grid with row/column relationships.
   - Batch size: `table_batch_size` (default 4).

5. **Page Assembly** — `PageAssembleModel` (always runs)
   - Combines layout clusters + text cells + table structures into `AssembledUnit` (body items + header items).
   - Releases page resources (image cache, backend reference, parsed page) unless retained by downstream options.

#### Document-level stages (sequential, after all pages)

6. **Reading Order** — `ReadingOrderModel` (always runs)
   - Reorders assembled units into logical reading order for the final `DoclingDocument`.

7. **Code/Formula Enrichment** — `CodeFormulaModel` (conditional: `do_code_enrichment` OR `do_formula_enrichment`, both default **False**)
   - Options class: `CodeFormulaModelOptions`.
   - When code enrichment is enabled: sets `CodeItem.code_language` to detected `CodeLanguageLabel`.
   - When formula enrichment is enabled: updates formula text with enriched/cleaned LaTeX.
   - Prepended to the enrichment pipe before picture enrichers.

8. **Picture Classification** — `DocumentPictureClassifier` (conditional: `do_picture_classification`, default **False**)
   - Options class: `DocumentPictureClassifierOptions`.
   - Inherited from `ConvertPipeline` base class.
   - Attaches `PictureItem.meta.classification` with `{predictions: [{class_name, confidence, created_by}]}`.

9. **Picture Description** — factory-created via `get_picture_description_factory()` (conditional: `do_picture_description`, default **False**)
   - Options class: `PictureDescriptionApiOptions` (remote API) or `PictureDescriptionVlmOptions` (local VLM).
   - Inherited from `ConvertPipeline` base class.
   - Attaches `PictureItem.meta.description` with `{text, created_by}`.
   - Filtering: `picture_area_threshold`, `classification_allow`/`classification_deny`, `classification_min_confidence`.

#### Image generation options (not model stages)

10. **Page/picture/table image generation** — controlled by boolean flags, default all **False**:
    - `generate_page_images`: retains rendered page images in `Page._image_cache`.
    - `generate_picture_images`: extracts individual picture images from pages.
    - `generate_table_images`: deprecated — use `generate_page_images` + `TableItem.get_image()`.
    - `generate_parsed_pages`: retains intermediate `SegmentedPdfPage` data for debugging.

#### Threading and backpressure

Stages 1-5 run as concurrent threads wired by bounded `ThreadedQueue` instances. Backpressure config:
- `queue_max_size` (default 100): max items buffered between stages.
- `batch_polling_interval_seconds` (default 0.5s): max wait to accumulate a batch before processing.
- `document_timeout` (inherited from `PipelineOptions`): per-document timeout; timed-out pages are abandoned.

### C) For `AsrPipeline` formats

Execution shape:

1. Audio/video transcription model (`whisper` or `mlx-whisper` path).
2. Output becomes text items inside `DoclingDocument`.
3. Status can be `SUCCESS` or `PARTIAL_SUCCESS` for empty transcription case.

## 2.1.3 OCR in "General Default"

Default OCR behavior is format-family dependent:

1. `PdfPipelineOptions.do_ocr = True` by default, therefore OCR-enabled behavior applies by default for `StandardPdfPipeline` family.
2. OCR is not a default stage for `SimplePipeline` formats.
3. OCR engine default is `OcrAutoOptions` in `PdfPipelineOptions`.

Auto OCR selection order from `auto_ocr_model.py`:

1. `ocrmac` on macOS if available
2. `rapidocr` with `onnxruntime` if available
3. `easyocr` if available
4. `rapidocr` with `torch` if available
5. otherwise no OCR engine available warning

## 2.1.4 Supported Extensions and MIME Families (Source Contract)

The extension and MIME contracts are defined in `FormatToExtensions` and `FormatToMimeType` in `base_models.py`.

Key implications:

1. `xml` and `txt` can map to `xml_uspto` depending detection path.
2. `application/xml` can map to multiple XML-oriented input formats (resolver context matters).
3. `audio` family includes both audio and some video MIME types for ASR extraction.

Full disambiguation logic (zip correction, gzip detection, XML DOCTYPE heuristics, content-type fallback chain): see Section 13.1.

## 2.1.5 Completeness Check

Requested outcomes from 2.1 and status:

1. "Identify supported input formats first": complete.
2. "Identify default/general parsing execution comprehensively": complete.
3. "Include OCR possibility in defaults": complete with engine selection path.

## 3) Parsing Pipeline Extenders

"Extenders" are configurable options that modify what a pipeline does beyond its minimum default behavior. Each extender is gated by an option field, targets a specific pipeline family, and has a model or subsystem that implements it.

### 3.1 Extender Catalog (What Exists)

#### Extender category A: OCR engine stack

Applicability: **StandardPdfPipeline only** (pdf, image, mets_gbs).
Gate: `PdfPipelineOptions.do_ocr` (default **True** — OCR is on by default for PDF family).
Parent options class: `OcrOptions` (abstract base).

Shared fields on all OCR engines:
- `lang`: `list[str]` — language codes (engine-specific format). Default `[]` for auto.
- `force_full_page_ocr`: `bool` (default False) — bypass selective OCR, run on entire page.
- `bitmap_area_threshold`: `float` (default 0.05) — minimum bitmap area fraction to trigger OCR.

| Engine | Options Class | `kind` | Platform | Key Config Fields |
|---|---|---|---|---|
| auto (default) | `OcrAutoOptions` | `"auto"` | Any | Auto-selects best available engine. No engine-specific fields. |
| rapidocr | `RapidOcrOptions` | `"rapidocr"` | Any | `backend` (onnxruntime/torch/openvino/paddle), `text_score`, `use_det`/`use_cls`/`use_rec`, model paths (`det_model_path`, `cls_model_path`, `rec_model_path`, `rec_keys_path`), `rapidocr_params` (dict passthrough) |
| easyocr | `EasyOcrOptions` | `"easyocr"` | Any (GPU optional) | `use_gpu`, `confidence_threshold`, `model_storage_directory`, `recog_network`, `download_enabled`, `suppress_mps_warnings` |
| tesseract (CLI) | `TesseractCliOcrOptions` | `"tesseract"` | Any (requires system install) | `tesseract_cmd` (binary path), `path` (tessdata dir), `psm` (page segmentation mode) |
| tesserocr (bindings) | `TesseractOcrOptions` | `"tesserocr"` | Any (requires tesserocr pip package) | `path` (tessdata dir), `psm` |
| ocrmac | `OcrMacOptions` | `"ocrmac"` | macOS only | `recognition` (recognition level), `framework` (Vision framework version) |

Auto-selection order (from `auto_ocr_model.py`):
1. `ocrmac` on macOS if available
2. `rapidocr` with `onnxruntime` backend if available
3. `easyocr` if available
4. `rapidocr` with `torch` backend if available
5. No engine available → warning, OCR skipped

#### Extender category B: Layout analysis

Applicability: **StandardPdfPipeline only** (pdf, image, mets_gbs).
Gate: Always runs (no `do_layout` toggle — layout is mandatory for the PDF pipeline).
Options class: `LayoutOptions` (extends `BaseLayoutOptions`).

Fields:
- `model_spec`: `LayoutModelConfig` — selects the layout detection model. Default: `DOCLING_LAYOUT_HERON`.
- `create_orphan_clusters`: `bool` (default True) — create clusters for elements not assigned to any structure.
- `keep_empty_clusters`: `bool` (default False) — retain clusters with no content.
- `skip_cell_assignment`: `bool` (default False) — skip assigning text cells to table clusters (performance optimization).

Available layout model specs (from `layout_model_specs.py`):

| Preset | Description |
|---|---|
| `DOCLING_LAYOUT_HERON` (default) | Balanced accuracy/speed |
| `DOCLING_LAYOUT_HERON_101` | Heron v1.0.1 variant |
| `DOCLING_LAYOUT_V2` | Legacy v2 model |
| `DOCLING_LAYOUT_EGRET_MEDIUM` | Higher accuracy, medium size |
| `DOCLING_LAYOUT_EGRET_LARGE` | Higher accuracy, large size |
| `DOCLING_LAYOUT_EGRET_XLARGE` | Highest accuracy, largest size |

#### Extender category C: Table structure extraction

Applicability: **StandardPdfPipeline only** (pdf, image, mets_gbs).
Gate: `PdfPipelineOptions.do_table_structure` (default **True**).
Options class: `TableStructureOptions` (extends `BaseTableStructureOptions`).

Fields:
- `mode`: `TableFormerMode` enum — `FAST` or `ACCURATE` (default **ACCURATE**).
- `do_cell_matching`: `bool` (default True) — align detected cells with content for improved accuracy.

Note: SimplePipeline formats (DOCX, HTML, XLSX, etc.) parse tables directly from document markup — no table structure model is needed or used.

#### Extender category D: Semantic enrichers

Applicability varies — see per-enricher notes below.

**D1. Code enrichment**
- Gate: `PdfPipelineOptions.do_code_enrichment` (default **False**)
- Applicability: **StandardPdfPipeline only**
- Model: `CodeFormulaModel` (shared with formula enrichment)
- Effect: Sets `CodeItem.code_language` to detected `CodeLanguageLabel` enum value

**D2. Formula enrichment**
- Gate: `PdfPipelineOptions.do_formula_enrichment` (default **False**)
- Applicability: **StandardPdfPipeline only**
- Model: `CodeFormulaModel` (shared with code enrichment)
- Effect: Updates formula text with enriched/cleaned LaTeX

**D3. Picture classification**
- Gate: `ConvertPipelineOptions.do_picture_classification` (default **False**)
- Applicability: **All pipelines** (inherited from `ConvertPipeline` base)
- Model: `DocumentPictureClassifier` (HuggingFace image classifier)
- Options: `DocumentPictureClassifierOptions`
- Effect: Attaches `PictureItem.meta.classification` with `{predictions: [{class_name, confidence, created_by}]}`
- Prerequisite: Picture items must have embedded images (always true for DOCX/PPTX/XLSX; requires `fetch_images` for HTML/MD; always true for PDF via page crop)

**D4. Picture description**
- Gate: `ConvertPipelineOptions.do_picture_description` (default **False**)
- Applicability: **All pipelines** (inherited from `ConvertPipeline` base)
- Options class: `PictureDescriptionBaseOptions` (abstract), with two implementations:

  | Variant | Options Class | `kind` | Requires |
  |---|---|---|---|
  | Remote API | `PictureDescriptionApiOptions` | `"api"` | `enable_remote_services = True`, running API endpoint |
  | Local VLM | `PictureDescriptionVlmOptions` | `"vlm"` | Model weights downloaded |

- Default model: `smolvlm_picture_description` (SmolVLM-256M-Instruct, local VLM)
- Pre-configured presets:
  - `smolvlm_picture_description` — `HuggingFaceTB/SmolVLM-256M-Instruct` (lightweight)
  - `granite_picture_description` — `ibm-granite/granite-vision-3.3-2b` (higher quality)
- Filtering fields (on `PictureDescriptionBaseOptions`):
  - `picture_area_threshold`: float (default 0.05) — skip pictures smaller than this page fraction
  - `classification_allow`: optional list of `PictureClassificationLabel` — allowlist
  - `classification_deny`: optional list — denylist
  - `classification_min_confidence`: float (default 0.0) — minimum classification confidence
- API-specific fields: `url`, `headers`, `params`, `timeout` (20s), `concurrency` (1), `prompt`, `provenance`
- VLM-specific fields: `repo_id`, `prompt`, `generation_config` (default `{max_new_tokens: 200, do_sample: False}`)
- Effect: Attaches `PictureItem.meta.description` with `{text, created_by}`

#### Extender category E: PDF backend selection

Applicability: **StandardPdfPipeline only** (pdf format specifically).
Options class: `PdfBackendOptions` (on `PdfFormatOption`).

- `password`: `SecretStr` (optional) — for encrypted PDFs.
- Backend selection via `PdfFormatOption.backend` class override (not a pipeline option — set at `DocumentConverter` format config level).

Available PDF backends (`PdfBackend` enum):

| Backend | Class | Description |
|---|---|---|
| `dlparse_v4` (default) | `DoclingParseV4DocumentBackend` | Latest, best accuracy for complex documents |
| `dlparse_v2` | `DoclingParseV2DocumentBackend` | V2 with improved table detection |
| `dlparse_v1` | `DoclingParseV1DocumentBackend` | V1, basic layout analysis |
| `pypdfium2` | `PyPdfiumDocumentBackend` | Fast, reliable basic text extraction |

#### Extender category F: Operational controls

Applicability: Varies by inheritance level.

**F1. Pipeline-level** (all pipelines — from `PipelineOptions`):
- `document_timeout`: `Optional[float]` (default **None** — no timeout). Seconds before aborting; returns `PARTIAL_SUCCESS`.
- `enable_remote_services`: `bool` (default **False**). Required for API-based picture description.
- `allow_external_plugins`: `bool` (default **False**). Required for third-party model plugins.
- `artifacts_path`: `Optional[Path]` (default **None**). Local model weights directory; None = download on first use.

**F2. Paginated pipeline** (StandardPdfPipeline, VlmPipeline — from `PaginatedPipelineOptions`):
- `images_scale`: `float` (default **1.0**). Page image resolution multiplier.
- `generate_page_images`: `bool` (default **False**). Retain rendered page PNGs.
- `generate_picture_images`: `bool` (default **False**). Extract individual picture images.

**F3. PDF pipeline specific** (from `PdfPipelineOptions`):
- `force_backend_text`: `bool` (default **False**). Bypass layout model, use PDF's native text layer directly.
- `generate_table_images`: `bool` (default **False**, **deprecated**). Use `generate_page_images` + `TableItem.get_image()` instead.
- `generate_parsed_pages`: `bool` (default **False**). Retain intermediate `SegmentedPdfPage` data for debugging.

**F4. Batching and backpressure** (from `PdfPipelineOptions`, StandardPdfPipeline threaded mode):
- `ocr_batch_size`: `int` (default **4**). Pages per OCR batch.
- `layout_batch_size`: `int` (default **4**). Pages per layout batch.
- `table_batch_size`: `int` (default **4**). Tables per table structure batch.
- `batch_polling_interval_seconds`: `float` (default **0.5**). Max wait to accumulate a batch.
- `queue_max_size`: `int` (default **100**). Max items buffered between stages (backpressure).

#### Extender category G: Hardware acceleration

Applicability: **All pipelines** (from `PipelineOptions.accelerator_options`).
Options class: `AcceleratorOptions` (Pydantic settings — also configurable via `DOCLING_*` env vars).

- `device`: `str` (default **"auto"**). Options: `auto`, `cpu`, `cuda`, `cuda:N`, `mps` (Apple Silicon), `xpu` (Intel GPU).
- `num_threads`: `int` (default **4**). CPU threads for inference. Also reads `OMP_NUM_THREADS` env var.
- `cuda_use_flash_attention2`: `bool` (default **False**). Flash Attention 2 for NVIDIA Ampere+ GPUs.

## 3.2 Default Values (Critical for Planning)

From `pipeline_options.py`:

1. `enable_remote_services = False`
2. `allow_external_plugins = False`
3. `do_picture_classification = False`
4. `do_picture_description = False`
5. `PdfPipelineOptions.do_table_structure = True`
6. `PdfPipelineOptions.do_ocr = True`
7. `PdfPipelineOptions.do_code_enrichment = False`
8. `PdfPipelineOptions.do_formula_enrichment = False`
9. `images_scale = 1.0` (paginated defaults)
10. `generate_page_images = False` (except VLM pipeline class)
11. `generate_picture_images = False`

## 3.3 Format-by-Format Extender Availability

Legend:

1. `Y`: natively applicable in default execution family
2. `P`: possible but not default/depends on output content
3. `N`: not part of default family behavior

| InputFormat | Pipeline family | OCR | Table structure | Code enrich | Formula enrich | Picture class | Picture desc | ASR options |
|---|---|---|---|---|---|---|---|---|
| `pdf` | StandardPdfPipeline | Y | Y | Y | Y | Y | Y | N |
| `image` | StandardPdfPipeline | Y | Y | Y | Y | Y | Y | N |
| `mets_gbs` | StandardPdfPipeline | Y | Y | Y | Y | Y | Y | N |
| `docx` | SimplePipeline | N | N | N | N | P | P | N |
| `pptx` | SimplePipeline | N | N | N | N | P | P | N |
| `html` | SimplePipeline | N | N | N | N | P | P | N |
| `asciidoc` | SimplePipeline | N | N | N | N | P | P | N |
| `md` | SimplePipeline | N | N | N | N | P | P | N |
| `csv` | SimplePipeline | N | N | N | N | P | P | N |
| `xlsx` | SimplePipeline | N | N | N | N | P | P | N |
| `xml_uspto` | SimplePipeline | N | N | N | N | P | P | N |
| `xml_jats` | SimplePipeline | N | N | N | N | P | P | N |
| `json_docling` | SimplePipeline | N | N | N | N | P | P | N |
| `vtt` | SimplePipeline | N | N | N | N | P | P | N |
| `audio` | AsrPipeline | N | N | N | N | N | N | Y |

Important nuance for `P`:

1. `SimplePipeline` inherits `ConvertPipeline` enrichers (picture class/description), but usefulness depends on whether backend output contains `PictureItem`s.
2. It is not equivalent to PDF family OCR/layout/table/code/formula model stack.

## 3.4 Extender Prerequisites and Environment Requirements

OCR prerequisites:

1. `easyocr` requires `easyocr` package (`pip install easyocr`).
2. `rapidocr` requires `rapidocr` and backend runtime (`onnxruntime` commonly).
3. `tesseract` CLI requires discoverable system `tesseract` binary and language packs.
4. `tesserocr` requires compiled python bindings and proper `TESSDATA_PREFIX` language models.
5. `ocrmac` requires macOS and `ocrmac` installation.

Picture description prerequisites:

1. API mode (`PictureDescriptionApiOptions`) requires `enable_remote_services=True` else raises `OperationNotAllowed`.
2. VLM mode requires transformers/VLM dependencies (`docling[vlm]` path), and practical accelerator capacity for larger models.

ASR prerequisites:

1. Native whisper path requires `openai-whisper` (except Python 3.14 dependency caveat in current source message).
2. MLX whisper path requires `mlx-whisper` and Apple Silicon oriented runtime.

Model artifact management prerequisites:

1. For offline/controlled environments, model artifacts should be prefetched and referenced via `artifacts_path`.
2. `docling-tools models download` is the documented prefetch route.

## 3.5 Pipeline Extenders by Document Quality Tier (Planning Guidance)

This subsection converts raw options into implementation-ready profiles. Canonical profile names use the `docling_` prefix (see Section 13.6 for reconciliation); shorthand names are used below for readability.

Profile `pdf_fast_deterministic`:

1. `do_ocr=False` when embedded text quality is high.
2. `do_table_structure=False` for speed when table recovery is non-critical.
3. all enrichers disabled.

Profile `pdf_balanced_default`:

1. `do_ocr=True`
2. `do_table_structure=True`
3. code/formula/picture enrichers disabled
4. picture description disabled

Profile `pdf_high_recall_layout_semantic`:

1. `do_ocr=True` with explicit OCR engine selection as needed.
2. `do_table_structure=True`, `TableFormerMode.ACCURATE`.
3. `do_code_enrichment=True` and `do_formula_enrichment=True`.
4. `do_picture_classification=True`.
5. `do_picture_description=True` with either local VLM or API mode.
6. if API mode, require `enable_remote_services=True`.

Profile `simple_pipeline_picture_aware`:

1. for non-paginated formats where pictures exist and matter:
2. `do_picture_classification=True`
3. `do_picture_description=True` (local or API)
4. no OCR/table/code/formula stack expected in this family.

Profile `audio_asr_default`:

1. ASR model chosen via `asr_options`.
2. tune timeout/batching based on file duration and runtime resources.

## 3.6 Completeness Check

Requested outcomes from 2.2 and status:

1. "Identify and define available parsing pipeline extenders": complete.
2. "Match extenders by supported input formats": complete via matrix and family mapping.
3. "Include setup requirements (services/hardware/config)": complete.
4. "Address quality-sensitive parsing strategy (especially PDF)": complete via profile framework.

## 4) Parsed Block (Node) Types by Input Format Type

## 4.1 Docling Intermediary Internal Format

Docling conversion output is a `DoclingDocument` representation with two major layers:

Content item collections:

1. `texts`
2. `tables`
3. `pictures`
4. `key_value_items`

Structural containers and hierarchy:

1. `body`
2. `furniture`
3. `groups`

Key properties for downstream system design:

1. parent/child relations are pointer-based
2. reading order is represented through body tree and child order
3. provenance and layout metadata can be attached to items
4. top-level arrays + tree structure permit both flat and hierarchical traversal

## 4.2 What "Parsed Unit" Becomes

After parsing, the practical "unit" is a typed item (text/table/picture/etc.) with:

1. semantic label (`DocItemLabel`)
2. position in structure (parent/group/body/furniture)
3. optional layout/provenance
4. exportability to markdown/json/text/html/doctags

Docling JSON should be treated as the canonical parser artifact, not a transient byproduct.

## 4.3 Type Inventory for Schema Planning

Two necessary inventories are used together:

1. Theoretical taxonomy: labels/classes exposed by model/backends/API references.
2. Empirical corpus taxonomy: labels/groups actually observed per format in `groundtruth/docling_v2`.

Your requested axis model is therefore implemented as:

1. axis X: input format (observed via MIME in corpus)
2. axis Y: label/group type
3. cell: observed/not observed (with counts where available)

## 4.4 Observed Doc Item Labels by MIME (Corpus)

High-level observed sets:

1. `application/pdf`: caption, checkbox_selected, checkbox_unselected, code, document_index, footnote, formula, list_item, page_footer, page_header, picture, section_header, table, text
2. `application/vnd.openxmlformats-officedocument.wordprocessingml.document`: formula, list_item, paragraph, picture, section_header, table, text, title
3. `application/vnd.ms-powerpoint`: list_item, paragraph, picture, table, text, title
4. `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`: picture, table
5. `text/html`: caption, code, list_item, picture, section_header, table, text, title
6. `text/markdown`: caption, picture, section_header, table, text, title
7. `text/csv`: table
8. `application/xml`: caption, list_item, paragraph, picture, section_header, table, text, title
9. `text/vtt`: text
10. `text/plain`: paragraph, section_header, title (present in corpus)

## 4.5 Observed Group Labels by MIME (Corpus)

High-level observed sets:

1. `application/pdf`: form_area, key_value_area, list
2. `application/vnd.openxmlformats-officedocument.wordprocessingml.document`: comment_section, inline, list, picture_area, section, unspecified
3. `application/vnd.ms-powerpoint`: chapter, list
4. `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`: section
5. `text/html`: inline, list, section, unspecified
6. `text/vtt`: inline
7. `application/xml`: list

## 4.6 23 + 12 Type Framing and Practical Interpretation

The full enum universe in `docling-core >=2.62.0` is **23 DocItemLabels + 12 GroupLabels**:

**DocItemLabels (23):** caption, chart, checkbox_selected, checkbox_unselected, code, document_index, empty_value, footnote, form, formula, grading_scale, handwritten_text, key_value_region, list_item, page_footer, page_header, paragraph, picture, reference, section_header, table, text, title

**GroupLabels (12):** chapter, comment_section, form_area, inline, key_value_area, list, ordered_list, picture_area, section, sheet, slide, unspecified

Of these, **16 DocItemLabels** and **9 GroupLabels** are observed in the groundtruth corpus or emitted by backend source code. The remaining 7 + 3 are defined in the enum but unobserved:

- Unobserved DocItemLabels: chart, empty_value, form, grading_scale, handwritten_text, key_value_region, reference
- Unobserved GroupLabels: ordered_list, sheet, slide

Practical interpretation:

1. The full enum universe is the contract — any consumer must accept all 23 + 12 values.
2. The corpus-observed subset is the immediate baseline for testing and validation.
3. Unobserved labels may appear with future Docling versions, new backends, or VLM pipeline output.
4. For implementation safety, use superset-friendly registry, not strict observed-only set.

## 4.7 Completeness Check

Requested outcomes from 2.3 and status:

1. "Define intermediary internal format and what it does": complete.
2. "Map block/node types by input format": complete with MIME matrices and per-file inventory appendices.
3. "Translate to schema implications": complete with prescriptive contracts.

## 5) DoclingDocument Output Shape (Source-Validated)

This section documents the actual JSON structure Docling produces. Cross-validated against groundtruth corpus files and source code.

### 5.1 Top-Level Structure

Core top-level keys observed in all non-meta groundtruth files (`92/92`):

1. `schema_name`: `"DoclingDocument"` (always)
2. `version`: Docling document schema version (e.g., `"1.9.0"`)
3. `name`: Document name (from filename)
4. `origin`: Source metadata object (see 8.6)
5. `furniture`: Root container for non-body content (page headers, footers, navigation)
6. `body`: Root container for main content
7. `groups`: Array of structural container objects (lists, inline groups, sections)
8. `texts`: Array of text item objects
9. `tables`: Array of table objects
10. `pictures`: Array of picture objects
11. `key_value_items`: Array of key-value pair objects (present in all corpus samples; empty in this corpus snapshot)
12. `pages`: Page map object (present in all corpus samples)

Additional top-level key with partial corpus presence:

1. `form_items`: Present in `91/92` non-meta corpus files (`word_sample.json` is the only observed file without it).

### 5.2 Text Item Shape

Each text item in the `texts` array:

1. `self_ref`: JSON pointer string (e.g., `"#/texts/0"`)
2. `parent`: JSON reference object `{"$ref": "#/body"}` or `{"$ref": "#/groups/N"}`
3. `children`: Array of JSON reference objects (empty for leaf items)
4. `content_layer`: `"body"` or `"furniture"`
5. `label`: DocItemLabel string (`text`, `title`, `section_header`, `list_item`, `paragraph`, `caption`, `footnote`, `page_header`, `page_footer`, `code`, `formula`, `checkbox_selected`, `checkbox_unselected`, `document_index`)
6. `prov`: Array of provenance objects (see 8.5)
7. `orig`: Original text before processing
8. `text`: Actual text content
9. `formatting`: Object with `{bold, italic, underline, strikethrough}` booleans and `script` enum (`baseline`, `superscript`, `subscript`) — DOCX only
10. `hyperlink`: Optional URL string — HTML only
11. `enumerated`: Boolean — list items only (numbered vs bulleted)
12. `marker`: String — list items only (e.g., `"1."`, `"-"`, `""`)
13. `level`: Integer — section headers only (hierarchy depth 1, 2, 3...)
14. `code_language`: CodeLanguageLabel — code items only (set by code enricher)

### 5.3 Table Item Shape

Each table in the `tables` array:

1. `self_ref`: JSON pointer string (e.g., `"#/tables/0"`)
2. `parent`: JSON reference object
3. `children`: Array of references to groups (rich cell groups)
4. `content_layer`: `"body"`
5. `label`: `"table"` (always)
6. `prov`: Array of provenance objects
7. `captions`: Array of text references for table captions
8. `references`: Array (empty in corpus)
9. `footnotes`: Array (empty in corpus)
10. `data`: Object containing:
    - `table_cells`: Array of cell objects, each with:
      - `bbox`: Optional BoundingBox (PDF only)
      - `row_span`, `col_span`: Integer
      - `start_row_offset_idx`, `end_row_offset_idx`: Integer
      - `start_col_offset_idx`, `end_col_offset_idx`: Integer
      - `text`: Cell content text
      - `column_header`, `row_header`, `row_section`: Boolean
      - `fillable`: Boolean
      - `ref`: Optional reference to group (HTML tables reference cell contents via groups)

### 5.4 Picture Item Shape

Each picture in the `pictures` array:

1. `self_ref`: JSON pointer string (e.g., `"#/pictures/0"`)
2. `parent`: JSON reference
3. `children`: Array (usually empty)
4. `content_layer`: `"body"` or `"furniture"`
5. `label`: `"picture"` (always)
6. `prov`: Array of provenance objects
7. `captions`: Array of references to caption text items
8. `references`: Array (empty in corpus)
9. `footnotes`: Array (empty in corpus)
10. `annotations`: Array (backward-compat; enrichment data in newer versions uses `meta`)
11. `image`: Object (DOCX/PPTX/XLSX always embedded; HTML/MD possible with fetch_images; absent for PDF) containing:
    - `mimetype`: e.g., `"image/png"`
    - `dpi`: Integer resolution
    - `size`: `{width, height}` floats
    - `uri`: Base64 data URI (`data:image/png;base64,...`)
12. `meta`: Object (when enrichment is enabled):
    - `classification`: `{predictions: [{class_name, confidence, created_by}]}`
    - `description`: `{text, created_by}`

### 5.5 Provenance Object Shape

Each provenance entry in `prov` arrays:

1. `page_no`: Integer (1-indexed page number)
2. `bbox`: BoundingBox object:
   - `l`: Left coordinate (float)
   - `t`: Top coordinate (float)
   - `r`: Right coordinate (float)
   - `b`: Bottom coordinate (float)
   - `coord_origin`: Coordinate system origin (`"BOTTOMLEFT"` or `"TOPLEFT"`, backend-dependent)
3. `charspan`: `[start, end]` integer array (character offset range in extracted text)

Critical format-specific behavior:

1. **PDF**: Provenance populated in all observed files (`12/12`), with `coord_origin=BOTTOMLEFT`.
2. **PPTX**: Provenance populated in all observed files (`4/4`), with mostly `BOTTOMLEFT` and some `TOPLEFT`.
3. **XLSX**: Provenance populated in all observed files (`5/5`), with `coord_origin=TOPLEFT`.
4. **Markdown (`text/markdown`)**: Provenance populated in all observed markdown corpus files (`3/3`), with `coord_origin=TOPLEFT`.
5. **DOCX/XML/HTML/CSV/VTT/text/plain**: Provenance empty in current corpus snapshot.
6. **Image/METS_GBS**: Expected to carry paginated provenance through `StandardPdfPipeline`; not separately represented as MIME rows in this groundtruth snapshot.

### 5.6 Origin Object Shape

Document-level metadata in `origin`:

1. `mimetype`: Source MIME type (e.g., `"application/pdf"`)
2. `binary_hash`: Source hash identifier (serialized as integer in current groundtruth/examples; treat as parser-native identifier, not fixed-width text)
3. `filename`: Original filename string

### 5.7 Body, Furniture, Groups Structure

All three use JSON Pointer references for parent/child relationships:

1. `body`: Root container (`self_ref: "#/body"`, `content_layer: "body"`, `name: "_root_"`, `label: "unspecified"`). Its `children` array contains `$ref` pointers to all body-level items.
2. `furniture`: Root container (`self_ref: "#/furniture"`, `content_layer: "furniture"`). Page headers, footers, navigation sidebars.
3. `groups`: Array of containers for hierarchical structure. Each group has:
   - `self_ref`: e.g., `"#/groups/0"`
   - `name`: Descriptive (e.g., `"list"`, `"inline"`, `"rich_cell_group_X_Y_Z"`)
   - `label`: GroupLabel string (`list`, `inline`, `section`, `chapter`, `picture_area`, `comment_section`, `form_area`, `key_value_area`, `unspecified`)
   - `children`: References to items within the group

### 5.8 Format-Specific Field Availability Matrix

| Field | PDF | DOCX | PPTX | HTML | Markdown | CSV | XLSX | XML | VTT | Audio |
|---|---|---|---|---|---|---|---|---|---|---|
| prov (populated) | Y | N | Y | N | Y* | N | Y | N | N | N |
| prov.bbox | Y | N | Y | N | Y* | N | Y | N | N | N |
| prov.page_no | Y | N | Y | N | Y* | N | Y | N | N | N |
| text.formatting | N | Y | N | N | N | N | N | N | N | N |
| text.hyperlink | N | N | N | Y | N | N | N | N | N | N |
| picture.image (embedded) | N | Y | Y | P | P | N | Y | N | N | N |
| table.data.table_cells.bbox | Y | N | N | N | N | N | N | N | N | N |
| TrackSource (timestamps) | N | N | N | N | N | N | N | N | N | Y |

Legend: `Y` = present, `N` = absent, `P` = possible if fetch_images enabled, `Y*` = present in current markdown corpus subset (`text/markdown` rows).

Source evidence for corrections:
1. PPTX picture.image: `mspowerpoint_backend.py:589` — `ImageRef.from_pil(image=pil_image, dpi=im_dpi)` — always embedded.
2. XLSX picture.image: `msexcel_backend.py:644` — `ImageRef.from_pil(image=pil_image, dpi=72)` — always embedded.

## 6) ConversionResult Wrapper (Beyond DoclingDocument)

Docling wraps every converted document in a `ConversionResult` that carries metadata beyond the DoclingDocument itself. This metadata is critical for provenance and quality tracking in any consuming platform.

### 6.1 ConversionResult Structure

From `docling/datamodel/document.py`:

1. `input`: `InputDocument` — source metadata:
   - `file`: Path or stream reference
   - `format`: InputFormat enum value
   - `filesize`: Integer bytes
   - `page_count`: Integer (PDF/image/PPTX)
   - `limits`: DocumentLimits (max_num_pages, max_file_size, page_range)
2. `pages`: `List[Page]` — per-page processing results
3. `document`: `DoclingDocument` — the final output
4. `status`: `ConversionStatus` enum (`pending`, `started`, `failure`, `success`, `partial_success`, `skipped`)
5. `errors`: `List[ErrorItem]` — pipeline errors with component_type, module_name, error_message
6. `timings`: `Dict[str, ProfilingItem]` — execution time metrics scoped by DOCUMENT or PAGE
7. `confidence`: `ConfidenceReport` — quality scores
8. `version`: `DoclingVersion` — docling version, docling-core version, platform, Python version
9. `assembled`: `AssembledUnit` — raw page elements before DoclingDocument construction (paginated pipeline only)

### 6.2 DoclingVersion Model (Provenance Snapshot)

Source: `docling/datamodel/document.py:250-260`

Docling captures a complete version snapshot at conversion time:

1. `docling_version` — e.g., `"2.31.0"`
2. `docling_core_version` — e.g., `"2.23.0"`
3. `docling_ibm_models_version` — layout/table model library version
4. `docling_parse_version` — PDF parsing library version
5. `platform_str` — OS platform string
6. `py_impl_version` — Python implementation cache tag
7. `py_lang_version` — Python version

This composite version captures not just Docling's version but its entire dependency chain, which is essential for reproducibility.

### 6.3 Confidence Scoring System

Hierarchical quality scoring (PDF pipeline only — not available for SimplePipeline formats):

Per-page scores (`PageConfidenceScores`):

1. `parse_score`: Float (backend text extraction quality)
2. `layout_score`: Float (mean confidence of layout model clusters)
3. `table_score`: Float (table structure model confidence)
4. `ocr_score`: Float (mean confidence of OCR text cells)

All default to `NaN` when not computed (e.g., SimplePipeline formats).

Quality grade thresholds:

1. `POOR`: score < 0.5
2. `FAIR`: score >= 0.5 and < 0.8
3. `GOOD`: score >= 0.8 and < 0.9
4. `EXCELLENT`: score >= 0.9
5. `UNSPECIFIED`: when score is NaN

Document-level aggregation:

1. `layout_score` = mean of per-page layout scores
2. `parse_score` = 10th percentile of per-page parse scores (represents worst case)
3. `table_score` = mean of per-page table scores
4. `ocr_score` = mean of per-page OCR scores
5. `mean_grade` / `low_grade` computed from aggregated scores

### 6.4 Error Tracking

Each error carries:

1. `component_type`: `DoclingComponentType` enum (`DOCUMENT_BACKEND`, `MODEL`, `DOC_ASSEMBLER`, `USER_INPUT`, `PIPELINE`)
2. `module_name`: String (class name of failing component, e.g., `"StandardPdfPipeline"`)
3. `error_message`: Human-readable string

### 6.5 Timing Profiling

Stage-level timing with scopes:

1. `page_init`, `page_ocr`, `page_layout`, `page_table`, `page_assemble` (PAGE scope)
2. `doc_build`, `doc_assemble`, `doc_enrich`, `pipeline_total` (DOCUMENT scope)

### 6.6 Serialization and Version Tracking

ConversionResult can be saved as a ZIP archive (`ConversionAssets.save()`) containing:

1. `timestamp.json`: ISO datetime
2. `version.json`: DoclingVersion (docling, docling-core, platform, Python)
3. `status.json`: ConversionStatus
4. `errors.json`: Error list
5. `pages.json`: Page list
6. `timings.json`: Timing dict
7. `confidence.json`: ConfidenceReport
8. `document.json`: DoclingDocument export

## 7) Enrichment Output Shapes (Detailed)

What each enricher produces and where it attaches to DoclingDocument items. Critical for understanding what metadata each enricher attaches to DoclingDocument items.

### 7.1 Picture Classification

Model: `DocumentPictureClassifier` (HuggingFace image classifier)

Attachment point: `PictureItem.meta.classification`

Output shape:

```json
{
  "predictions": [
    {
      "class_name": "diagram",
      "confidence": 0.95,
      "created_by": "DocumentPictureClassifier"
    },
    {
      "class_name": "photograph",
      "confidence": 0.03,
      "created_by": "DocumentPictureClassifier"
    }
  ]
}
```

Also appends to legacy `item.annotations` for backward compatibility.

### 7.2 Picture Description

Model: `PictureDescriptionApiModel` (remote API) or `PictureDescriptionVlmModel` (local VLM)

Attachment point: `PictureItem.meta.description`

Output shape:

```json
{
  "text": "A technical diagram showing system architecture with three layers...",
  "created_by": "PictureDescriptionApiModel"
}
```

Filtering logic (controls which pictures get described):

1. `picture_area_threshold`: Minimum fraction of page area (default 0.0 = all)
2. `classification_allow`: Allowlist of picture classes to describe
3. `classification_deny`: Denylist of picture classes to skip
4. `classification_min_confidence`: Minimum classification confidence for filtering

### 7.3 Code/Formula Enrichment

Model: `CodeFormulaModel`

Attachment: Directly modifies item properties (no metadata object).

1. `CodeItem.code_language`: Set to `CodeLanguageLabel` enum value (e.g., `PYTHON`, `JAVA`, `UNKNOWN`)
2. `item.text`: Updated with enriched/cleaned text from model output

### 7.4 ASR Transcript Enrichment

Pipeline: `AsrPipeline` (Whisper or MLX-Whisper)

Attachment: `TextItem.source` (TrackSource object)

Output shape per text item:

```json
{
  "start_time": 12.5,
  "end_time": 18.3,
  "voice": "Speaker-1"
}
```

Word-level timestamps (optional, if `word_timestamps=True`): each segment may include `words: [{text, start_time, end_time}]`.

### 7.5 Layout Detection

Model: `LayoutModel` (DoclingIBM layout predictor)

Attachment: `Page.predictions.layout` (intermediate; not directly on DoclingDocument items)

Per-cluster output:

1. `id`: Integer
2. `label`: DocItemLabel (TEXT, TABLE, PICTURE, etc.)
3. `confidence`: Float (0.0-1.0)
4. `bbox`: BoundingBox (l, t, r, b)
5. `cells`: List of TextCell objects assigned to cluster

Flows into `ConversionResult.confidence.pages[page_no].layout_score` as mean cluster confidence.

## 8) VLM Pipeline Family (Fourth Pipeline)

The existing Sections 2-4 cover three pipeline families. There is a fourth: `VlmPipeline`.

### 8.1 VLM Pipeline Overview

From `pipeline/vlm_pipeline.py`:

1. Class: `VlmPipeline` (extends `PaginatedPipeline`)
2. Purpose: Vision-language model based document processing — uses a VLM to interpret page images directly
3. Not currently assigned as default for any InputFormat (must be explicitly configured via format options)
4. Options class: `VlmPipelineOptions`

### 8.2 VLM Pipeline Configuration

Key options:

1. `generate_page_images`: `True` by default (required — VLM needs page images as input)
2. `force_backend_text`: `False` by default (when true, uses backend text instead of VLM output)
3. `vlm_options`: One of:
   - `InlineVlmOptions`: Local model via HuggingFace
     - `repo_id`: Model ID
     - `inference_framework`: `"transformers"` | `"mlx"` | `"vllm"`
     - `response_format`: `DOCTAGS` | `MARKDOWN` | `DEEPSEEKOCR_MARKDOWN` | `HTML` | `OTSL` | `PLAINTEXT`
     - `max_new_tokens`: 4096 default
     - `load_in_8bit`: Quantization option
     - `temperature`: 0.0 default (deterministic)
     - `scale`: Image scaling (2.0 default)
   - `ApiVlmOptions`: Remote OpenAI-compatible API
     - `url`: Endpoint (default `http://localhost:11434/v1/chat/completions`)
     - `headers`, `params`: Auth/config
     - `timeout`: 60s default
     - `concurrency`: 1 default
     - `response_format`: Expected output format
     - `stop_strings`: Early stop tokens

## 9) Backend Options Per Format

From `datamodel/backend_options.py`. These options affect parsing behavior per format and should be captured in provenance.

### 9.1 Backend Options Catalog

| Format | Backend Options Class | Key Fields |
|---|---|---|
| PDF | `PdfBackendOptions` | `password` (SecretStr, for encrypted PDFs) |
| HTML | `HTMLBackendOptions` | `fetch_images` (bool), `source_uri` (URL/Path for relative resolution), `add_title` (bool), `infer_furniture` (bool) |
| Markdown | `MarkdownBackendOptions` | `fetch_images` (bool), `source_uri` (URL/Path for relative resolution) |
| XLSX | `MsExcelBackendOptions` | `treat_singleton_as_text` (bool — 1x1 tables become text items) |
| All others | `DeclarativeBackendOptions` | No format-specific options |

### 9.2 Common Base Options

All backends inherit from `BaseBackendOptions`:

1. `enable_remote_fetch`: `False` default (allow fetching remote resources)
2. `enable_local_fetch`: `False` default (allow fetching local resources)

## 10) Output Formats and Export Capabilities

Docling supports multiple export formats from the DoclingDocument.

### 10.1 OutputFormat Enum

From `base_models.py`:

1. `md`: Markdown
2. `json`: JSON (native DoclingDocument serialization)
3. `yaml`: YAML
4. `html`: HTML
5. `html_split_page`: HTML with page breaks
6. `text`: Plain text
7. `doctags`: DocTags format (structured markup)

## 11) Evidence Anchors (Quick Index)

Format + defaults:

1. `ref-repos/docling/docling/datamodel/base_models.py:55`
2. `ref-repos/docling/docling/datamodel/base_models.py:85`
3. `ref-repos/docling/docling/datamodel/base_models.py:103`
4. `ref-repos/docling/docling/document_converter.py:148`

Pipeline behavior:

1. `ref-repos/docling/docling/pipeline/base_pipeline.py:147`
2. `ref-repos/docling/docling/pipeline/standard_pdf_pipeline.py:470`
3. `ref-repos/docling/docling/pipeline/standard_pdf_pipeline.py:480`
4. `ref-repos/docling/docling/pipeline/simple_pipeline.py:17`
5. `ref-repos/docling/docling/pipeline/asr_pipeline.py:367`

Extenders and options:

1. `ref-repos/docling/docling/datamodel/pipeline_options.py:714`
2. `ref-repos/docling/docling/datamodel/pipeline_options.py:724`
3. `ref-repos/docling/docling/datamodel/pipeline_options.py:940`
4. `ref-repos/docling/docling/datamodel/pipeline_options.py:949`
5. `ref-repos/docling/docling/datamodel/pipeline_options.py:959`
6. `ref-repos/docling/docling/datamodel/pipeline_options.py:968`
7. `ref-repos/docling/docling/datamodel/pipeline_options.py:750`
8. `ref-repos/docling/docling/datamodel/pipeline_options.py:759`

Remote service guards:

1. `ref-repos/docling/docling/models/stages/picture_description/picture_description_api_model.py:44`
2. `ref-repos/docling/docling/models/vlm_pipeline_models/api_vlm_model.py:34`

OCR engine/runtime constraints:

1. `ref-repos/docling/docling/models/stages/ocr/auto_ocr_model.py:45`
2. `ref-repos/docling/docling/models/stages/ocr/auto_ocr_model.py:62`
3. `ref-repos/docling/docling/models/stages/ocr/auto_ocr_model.py:85`
4. `ref-repos/docling/docling/models/stages/ocr/auto_ocr_model.py:100`
5. `ref-repos/docling/docling/models/stages/ocr/tesseract_ocr_cli_model.py:67`
6. `ref-repos/docling/docling/models/stages/ocr/tesseract_ocr_model.py:51`
7. `ref-repos/docling/docling/models/stages/ocr/rapid_ocr_model.py:112`

Docling document representation concept:

1. `ref-repos/docling/docs/concepts/docling_document.md`
2. `ref-repos/docling/docs/concepts/architecture.md`

Empirical type corpus:

1. `ref-repos/docling/tests/data/groundtruth/docling_v2/*.json`

## 12) ProvenanceItem Shape — Coordinates and Provenance Contract

Source: `docling_core.types.doc.ProvenanceItem` (used extensively in `readingorder_model.py`)

### 12.1 Exact JSON Structure (from groundtruth)

Every doc item in the paginated pipeline output carries a `prov` array. Each entry has:

```json
{
  "page_no": 1,
  "bbox": {
    "l": 194.48,
    "t": 698.34,
    "r": 447.55,
    "b": 689.96,
    "coord_origin": "BOTTOMLEFT"
  },
  "charspan": [0, 60]
}
```

Fields:

1. `page_no` — 1-indexed page number
2. `bbox.l` — left coordinate
3. `bbox.t` — top coordinate
4. `bbox.r` — right coordinate
5. `bbox.b` — bottom coordinate
6. `bbox.coord_origin` — coordinate system origin (`"BOTTOMLEFT"` or `"TOPLEFT"` depending on backend/output path)
7. `charspan` — `[start, end]` character span within the item's text

### 12.2 Multiple Provenance Entries

Items can have multiple `prov` entries when they span multiple regions (e.g., merged elements across pages or columns). The reading order model's `_merge_elements()` appends additional ProvenanceItems with updated charspans.

### 12.3 DocumentOrigin Shape

The DoclingDocument carries an `origin` field:

```json
{
  "mimetype": "application/pdf",
  "binary_hash": 3463920545297462180,
  "filename": "2305.03393v1-pg9.pdf"
}
```

1. `mimetype` — source MIME type
2. `binary_hash` — hash of source bytes (integer representation)
3. `filename` — original filename

These fields provide the inputs for deriving a stable source identity hash.

---

## 13) Integration Contracts

This section consolidates integration-critical contracts that define what Docling provides, how it must be captured, and where the current implementation stands relative to the intermediary spec. Each subsection addresses a specific gap identified in cross-document review.

### 13.1 Format Resolution Contract (Full Disambiguation Logic)

Source: `document.py` lines 495-584.

Docling resolves ambiguous file inputs through a five-stage detection chain:

**Stage 1 — MIME detection:**

- Path input: extension → `FormatToExtensions` lookup → MIME.
- Stream input: read first 8 KB → `filetype.guess_mime()` → extension fallback if magic bytes yield nothing.

**Stage 2 — Zip container correction:**

If detected MIME = `application/zip`, Docling re-derives the true OOXML MIME from the file extension:

| Extension | Corrected MIME |
|---|---|
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |

This applies identically to `Path` and `DocumentStream` inputs.

**Stage 3 — Gzip → METS/GBS detection:**

If detected MIME = `application/gzip`, calls `_detect_mets_gbs()` to inspect the tar.gz archive for METS XML structure.

**Stage 4 — Content-type fallback chain:**

Applied sequentially when prior stages yield no match:

1. `_detect_html_xhtml(content)` — checks for HTML/XHTML byte signatures.
2. `_detect_csv(content)` — checks for CSV structure.
3. Final fallback: `text/plain`.

**Stage 5 — Multi-format MIME disambiguation:**

If `MimeTypeToFormat` yields multiple `InputFormat` values for one MIME, `_guess_from_content()` applies content heuristics:

| MIME | Heuristic | Result |
|---|---|---|
| `application/xml` | DOCTYPE contains `us-patent-application-v4`, `us-patent-grant-v4`, `us-grant-025`, or `patent-application-publication` | `XML_USPTO` |
| `application/xml` | DOCTYPE contains `JATS-journalpublishing` or `JATS-archive` | `XML_JATS` |
| `text/plain` | Content starts with `PATN\r\n` | `XML_USPTO` |

Single-format non-text MIMEs resolve directly without heuristics.

**Integration implication:** Any platform routing layer that pre-detects format must replicate this full chain or delegate entirely to Docling. Partial reimplementation risks format misroutes, especially for XML-family and zip-container inputs.

### 13.2 Converter Control-Plane Contract

Source: `document_converter.py` lines 198-261.

**Constructor parameters:**

| Parameter | Type | Default | Contract |
|---|---|---|---|
| `allowed_formats` | `list[InputFormat]` or `None` | All `InputFormat` enum members | Restricts which formats the converter will accept. `None` = accept all. |
| `format_options` | `dict[InputFormat, FormatOption]` or `None` | Per-format defaults via `_get_default_option()` | Per-format pipeline class, pipeline options, backend class, and backend options. |

**Format option resolution order:**

1. For each format in `allowed_formats`, check if `format_options` provides a custom `FormatOption`.
2. If custom entry exists, use it (with IMAGE backward-compat normalization; see below).
3. If not, call `_get_default_option(format)` for the built-in default.
4. Result stored in `self.format_to_options: dict[InputFormat, FormatOption]`.

**Pipeline instance cache:**

| Aspect | Value |
|---|---|
| Cache key | `(pipeline_cls, options_hash)` tuple |
| Hash function | `MD5(str(pipeline_options.model_dump()))` |
| Storage | `self.initialized_pipelines` dict |
| Behavior | Same pipeline class + same options → reused instance; different options → new instance |

**IMAGE format backward-compat:** If `format_options[IMAGE]` specifies a non-`ImageDocumentBackend` backend, the converter auto-corrects to `ImageFormatOption` and emits a `DeprecationWarning`.

**Integration implication:** The platform profile system must produce a `format_options` dict compatible with the `FormatOption` model hierarchy. Profile serialization must round-trip cleanly through `FormatOption` → `PipelineOptions` → `model_dump()` → reconstruction.

### 13.3 Provenance Persistence Contract

Source: intermediary spec REQ-REP-01 through REQ-REP-05, REQ-ING-08, REQ-ING-11, REQ-PROV-01 through REQ-PROV-03.

For each Docling conversion, the following provenance fields are first-class integration outputs:

**Representation-level fields (target: `conversion_representations`):**

| Field | Type | Source in Docling | Required |
|---|---|---|---|
| `parser_version` | text | Docling package version (e.g. `2.70.0`) | Yes |
| `parser_pipeline_family` | text | `standard_pdf` / `simple` / `asr` / `vlm` | Yes |
| `parser_profile_name` | text | Canonical profile key (see 13.6) | Yes |
| `parser_backend_name` | text | Backend class name (e.g. `DoclingParseV4DocumentBackend`) | Yes |
| `parser_input_format` | text | Docling `InputFormat` enum value | Yes |
| `parser_input_mime` | text | Detected MIME type used during conversion | Yes |
| `parser_options_json` | jsonb | Effective options payload (sanitized, no secrets) | Yes |
| `parser_options_hash` | text | SHA-256 of canonical options (see 13.4) | Yes |
| `parser_extenders_json` | jsonb | Enabled extenders summary | When extenders active |

**Artifact-level provenance (in `artifact_meta` jsonb):**

```json
{
  "parser": {
    "name": "docling",
    "version": "2.70.0",
    "profile": "docling_pdf_balanced_default",
    "provenance_schema_version": 1,
    "effective_options": { "/* sanitized options */" : true },
    "effective_options_hash": "sha256hex..."
  }
}
```

**Current state:** None of these fields exist as columns on `conversion_representations`. The `artifact_meta` jsonb column exists but contains `{}`.

### 13.4 Hash Strategy Decision

**Conflict:** Docling uses MD5 for its internal pipeline cache (`document_converter.py:256-261`). The intermediary spec requires SHA-256 for persisted provenance hashes (REQ-PROV-02).

**Resolution:**

| Concern | Scope | Algorithm | Input | Purpose |
|---|---|---|---|---|
| Docling pipeline cache | Internal, not persisted | MD5 | `str(pipeline_options.model_dump())` | Pipeline instance reuse key |
| Integration provenance | Persisted, auditable | SHA-256 | `"docling_options_v1\n" + canonical_json_bytes(effective_options)` | Reproducibility anchor |

The two hashes serve different purposes and coexist without conflict. The platform must compute the SHA-256 hash independently after conversion completes, using the effective options that were actually applied. The MD5 cache key is a Docling implementation detail that must not be exposed or persisted.

Canonical JSON serialization for SHA-256 input: `json.dumps(obj, sort_keys=True, separators=(',', ':'))` encoded as UTF-8 bytes.

### 13.5 Block Field Persistence Contract

Source: intermediary spec REQ-BLK-04, REQ-BLK-05, REQ-ING-14, REQ-ING-15.

For each Docling-parsed block, the following fields are first-class outputs that must be persisted alongside the normalized block:

| Integration field | Docling source | Applies to | Notes |
|---|---|---|---|
| `raw_element_type` | `DocItem.label` (`DocItemLabel` enum value) | All blocks | Parser-native label before normalization to `block_type` |
| `raw_group_type` | Parent group's `GroupLabel` enum value | Blocks within groups | `null` for ungrouped items |
| `raw_item_ref` | `DocItem` self-reference (`#/...` JSON pointer) | All blocks | Stable pointer into DoclingDocument for traceability |
| `page_no` | `ProvenanceItem.page_no` | Paginated sources (`pdf`, `image`, `mets_gbs`, `pptx`, `xlsx`) | 1-indexed; `null` for non-paginated |
| `coordinates_json` | `ProvenanceItem.bbox` | Paginated sources with layout | Bounding box with `coord_origin`; see Section 12 |
| `parser_metadata_json` | Selected `DocItem` metadata fields | All blocks | Optional parser-native metadata slice (confidence, charspan, formatting) |

**Current state:** `blocks` has only `block_uid`, `conv_uid`, `block_index`, `block_type`, `block_locator`, `block_content`. The 6 fields above are not present as columns.

**Cross-reference:** Maps to Output B gaps G-02 (raw labels/groups) and G-03 (page geometry).

### 13.6 Profile Name Reconciliation

The intermediary spec (Section 9.5) defines canonical profile names with a `docling_` prefix. This document's Section 3.5 uses shorter unprefixed names.

| Intermediary spec (canonical) | Section 3.5 (shorthand) |
|---|---|
| `docling_pdf_fast_deterministic` | `pdf_fast_deterministic` |
| `docling_pdf_balanced_default` | `pdf_balanced_default` |
| `docling_pdf_high_recall_layout_semantic` | `pdf_high_recall_layout_semantic` |
| `docling_simple_picture_aware` | `simple_pipeline_picture_aware` |
| `docling_audio_asr_default` | `audio_asr_default` |

**Decision:** The `docling_` prefix is the canonical form. It namespaces profiles by parser tool, which is required when the platform supports multiple parser tools. The Section 3.5 names are shorthand for readability within this Docling-only document; the persisted `parser_profile_name` value must use the prefixed form.

### 13.7 Output B Gap Cross-Reference

The following Output B critical gaps (Section 4.1) map directly to integration contracts defined in this document:

| Output B gap | Description | v2 contract section | Docling status |
|---|---|---|---|
| G-01 | Parser provenance not implemented as first-class columns on `conversion_representations` | 13.3, 13.4 | Docling provides all source data; persistence contract defined |
| G-02 | Parser-native labels/groups not persisted on `blocks` | 13.5 | `DocItemLabel` and `GroupLabel` fully enumerated in Supertables C/D; extraction path documented in Section 5 |
| G-03 | Paginated geometry fields missing (`page_no`, `coordinates_json`) | 13.5, Section 12 | `ProvenanceItem` shape fully documented in Section 12; persistence contract defined |

All three gaps are implementation gaps (schema DDL + ingestion code), not Docling capability gaps. Docling already emits the required data.

### 13.8 Current-State vs Target-State Operational Delta

Source: intermediary spec REQ-ING-05 through REQ-ING-07 (current state), REQ-ING-10 through REQ-ING-16 (target state).

| Concern | Current state | Target state | Gap type |
|---|---|---|---|
| Docling config | Near-default; only `artifacts_path` customized | Profile-driven via `format_options` dict | Config |
| Enrichers | All disabled (code, formula, picture) | Profile-dependent; `high_recall` enables all | Config |
| Parser provenance | Not persisted in `artifact_meta` or columns | Full provenance fields on `conversion_representations` + `artifact_meta` | Schema DDL + code |
| Block raw labels | Not persisted | `raw_element_type`, `raw_group_type` on `blocks` | Schema DDL + code |
| Page geometry | Not persisted | `page_no`, `coordinates_json` on `blocks` | Schema DDL + code |
| Options hash | Not computed | SHA-256 canonical hash per conversion | Code |
| Profile naming | Not implemented (no profile system) | `docling_*` prefixed canonical names | Config |
| Remote services | Not enabled | Policy-gated per REQ-ING-12 | Policy |
| Format restriction | All formats allowed by default | `allowed_formats` from project/run config | Routing |

---

### Appendix A: Groundtruth Corpus Summary

Total JSON files inspected: 104
Total parsed DoclingDocument files (non-meta): 92

### Appendix B: Label Presence Matrix by MIME

| MIME | Count | caption | checkbox_selected | checkbox_unselected | code | document_index | footnote | formula | list_item | page_footer | page_header | paragraph | picture | section_header | table | text | title |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| application/pdf | 12 | Y | Y | Y | Y | Y | Y | Y | Y | Y | Y |  | Y | Y | Y | Y |  |
| application/vnd.ms-powerpoint | 4 |  |  |  |  |  |  |  | Y |  |  | Y | Y |  | Y | Y | Y |
| application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 5 |  |  |  |  |  |  |  |  |  |  |  | Y |  | Y |  |  |
| application/vnd.openxmlformats-officedocument.wordprocessingml.document | 19 |  |  |  |  |  |  | Y | Y |  |  | Y | Y | Y | Y | Y | Y |
| application/xml | 7 | Y |  |  |  |  |  |  | Y |  |  | Y | Y | Y | Y | Y | Y |
| text/csv | 8 |  |  |  |  |  |  |  |  |  |  |  |  |  | Y |  |  |
| text/html | 29 | Y |  |  | Y |  |  |  | Y |  |  |  | Y | Y | Y | Y | Y |
| text/markdown | 3 | Y |  |  |  |  |  |  |  |  |  |  | Y | Y | Y | Y | Y |
| text/plain | 1 |  |  |  |  |  |  |  |  |  |  | Y |  | Y |  |  | Y |
| text/vtt | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  | Y |  |

### Appendix C: Group Presence Matrix by MIME

| MIME | Count | chapter | comment_section | form_area | inline | key_value_area | list | picture_area | section | unspecified |
|---|---|---|---|---|---|---|---|---|---|---|
| application/pdf | 12 |  |  | Y |  | Y | Y |  |  |  |
| application/vnd.ms-powerpoint | 4 | Y |  |  |  |  | Y |  |  |  |
| application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 5 |  |  |  |  |  |  |  | Y |  |
| application/vnd.openxmlformats-officedocument.wordprocessingml.document | 19 |  | Y |  | Y |  | Y | Y | Y | Y |
| application/xml | 7 |  |  |  |  |  | Y |  |  |  |
| text/csv | 8 |  |  |  |  |  |  |  |  |  |
| text/html | 29 |  |  |  | Y |  | Y |  | Y | Y |
| text/markdown | 3 |  |  |  |  |  |  |  |  |  |
| text/plain | 1 |  |  |  |  |  |  |  |  |  |
| text/vtt | 4 |  |  |  | Y |  |  |  |  |  |

### Appendix D: File-Level Label/Group Inventory


#### D.1 MIME-Level Rollup (Compressed)

Use this as the primary table. It preserves coverage while removing row-level repetition.

| MIME | Files | Unique label signatures | Unique group signatures | Most common label signatures | Most common group signatures | Representative files |
|---|---:|---:|---:|---|---|---|
| `text/html` | 29 | 20 | 9 | `[5] table, text, title`; `[3] text, title` | `[6] (empty)`; `[5] unspecified` | `escaped_characters.md.json`, `example_01.html.json` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | 19 | 15 | 10 | `[3] picture, text`; `[2] list_item, section_header, text` | `[4] section`; `[3] (empty)` | `docx_grouped_images.docx.json`, `docx_rich_cells.docx.json` |
| `application/pdf` | 12 | 11 | 4 | `[2] caption, page_footer, picture, section_header, text` | `[6] (empty)`; `[4] list` | `2203.01017v2.json`, `2206.01062.json` |
| `text/csv` | 8 | 8 | 8 | `[8] table` | `[8] (empty)` | `csv-comma.csv.json`, `csv-comma-in-cell.csv.json` |
| `application/xml` | 7 | 3 | 2 | `[3] caption, list_item, paragraph, picture, section_header, table, text, title`; `[2] paragraph, section_header, title` | `[4] (empty)`; `[3] list` | `elife-56337.nxml.json`, `ipa20180000016.json` |
| `unknown` | 7 | 7 | 7 | `[7] (empty)` | `[7] (empty)` | `2203.01017v2.pages.meta.json`, `2206.01062.pages.meta.json` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 5 | 2 | 5 | `[3] table`; `[2] picture, table` | `[5] section` | `xlsx_01.xlsx.json`, `xlsx_02_sample_sales_data.xlsm.json` |
| `application/vnd.ms-powerpoint` | 4 | 4 | 2 | `[1] each signature (no dominant mode)` | `[2] chapter`; `[2] chapter, list` | `powerpoint_bad_text.pptx.json`, `powerpoint_issue_2663.pptx.json` |
| `text/vtt` | 4 | 4 | 2 | `[4] text` | `[2] inline`; `[2] (empty)` | `webvtt_example_01.vtt.json`, `webvtt_example_02.vtt.json` |
| `text/markdown` | 3 | 3 | 3 | `[1] each signature (no dominant mode)` | `[3] (empty)` | `deepseek_example.md.json`, `deepseek_simple.md.json` |
| `text/plain` | 1 | 1 | 1 | `[1] paragraph, section_header, title` | `[1] (empty)` | `pftaps057006474.json` |

#### D.2 Data-Quality Note

| Row type | Count | Treatment |
|---|---:|---|
| `unknown` MIME meta rows (`*.pages.meta.json`) | 7 | Exclude from label/group capability conclusions. Keep only for provenance completeness. |
| Content-bearing rows | 92 | Use for type-by-format conclusions and schema mapping. |

---

### Appendix E: Pipeline Options Field Inventory (from source)


#### E.1 Domain Rollup (from 91 raw fields)

Use this as the top-level table. It gives complete coverage by concern domain.

| Domain | Classes included | Field count | Source line span (`pipeline_options.py`) | What this domain controls |
|---|---|---:|---|---|
| OCR stack | `OcrOptions`, `OcrAutoOptions`, `RapidOcrOptions`, `EasyOcrOptions`, `TesseractCliOcrOptions`, `TesseractOcrOptions`, `OcrMacOptions` | 35 | 104-430 | OCR engine choice, language, confidence thresholds, runtime backend parameters |
| Picture description stack | `PictureDescriptionBaseOptions`, `PictureDescriptionApiOptions`, `PictureDescriptionVlmOptions` | 16 | 447-606 | Image captioning/classification gating, remote API vs VLM parameters |
| Pipeline/core orchestration | `PipelineOptions`, `ConvertPipelineOptions`, `PaginatedPipelineOptions`, `BaseLayoutOptions`, `LayoutOptions`, `AsrPipelineOptions`, `VlmPipelineOptions`, `VlmExtractionPipelineOptions`, `TableStructureOptions`, `PdfPipelineOptions` | 40 | 81-1109 | Stage toggles, artifacts generation, batching, queueing, layout/table controls |
| **Total** | 20 classes | **91** | 81-1109 | Full appendix coverage |

#### E.2 Decision-Critical Knobs (high implementation impact)

Use this as the operational subset for profile design and schema persistence.

| Field | Class | Applies to | Primary impact |
|---|---|---|---|
| `do_ocr` | `PdfPipelineOptions` | StandardPdfPipeline | OCR activation and cost/latency |
| `ocr_options` | `PdfPipelineOptions` | StandardPdfPipeline | OCR engine/config bundle |
| `do_table_structure` | `PdfPipelineOptions` | StandardPdfPipeline | Table extraction fidelity |
| `table_structure_options` | `PdfPipelineOptions` | StandardPdfPipeline | Table mode (`FAST`/`ACCURATE`) and matching |
| `layout_options` | `PdfPipelineOptions` | StandardPdfPipeline | Layout model behavior |
| `do_code_enrichment` | `PdfPipelineOptions` | StandardPdfPipeline | Code block enrichment |
| `do_formula_enrichment` | `PdfPipelineOptions` | StandardPdfPipeline | Formula enrichment |
| `do_picture_classification` | `ConvertPipelineOptions` | All convert pipelines | Picture semantic labeling |
| `do_picture_description` | `ConvertPipelineOptions` | All convert pipelines | Picture caption generation |
| `picture_description_options` | `ConvertPipelineOptions` | All convert pipelines | Description provider/mode parameters |
| `generate_page_images` | `PdfPipelineOptions` / `PaginatedPipelineOptions` | Paginated pipelines | Output artifact volume/storage |
| `generate_picture_images` | `PdfPipelineOptions` / `PaginatedPipelineOptions` | Paginated pipelines | Image artifact persistence |
| `generate_table_images` | `PdfPipelineOptions` | StandardPdfPipeline | Table image artifacts |
| `generate_parsed_pages` | `PdfPipelineOptions` | StandardPdfPipeline | Debug/provenance assets |
| `ocr_batch_size` | `PdfPipelineOptions` | StandardPdfPipeline | Throughput vs memory |
| `layout_batch_size` | `PdfPipelineOptions` | StandardPdfPipeline | Throughput vs memory |
| `table_batch_size` | `PdfPipelineOptions` | StandardPdfPipeline | Throughput vs memory |
| `queue_max_size` | `PdfPipelineOptions` | StandardPdfPipeline | Threaded backpressure behavior |
| `batch_polling_interval_seconds` | `PdfPipelineOptions` | StandardPdfPipeline | Scheduler/worker pacing |
| `enable_remote_services` | `PipelineOptions` | All | External service dependency activation |
| `allow_external_plugins` | `PipelineOptions` | All | Plugin surface activation |
| `accelerator_options` | `PipelineOptions` | All | CPU/GPU/MPS execution target |
| `asr_options` | `AsrPipelineOptions` | AsrPipeline | Audio model behavior |
| `vlm_options` | `VlmPipelineOptions` / `VlmExtractionPipelineOptions` | VLM families | Vision-language model execution |

#### E.3 Full Class Inventory (compact)

This preserves full class/field inventory while avoiding one-row-per-field expansion in the main doc.

| Class | #fields | Line span | Fields |
|---|---:|---|---|
| `TableStructureOptions` | 2 | 81-90 | `do_cell_matching`, `mode` |
| `OcrOptions` | 3 | 104-118 | `lang`, `force_full_page_ocr`, `bitmap_area_threshold` |
| `OcrAutoOptions` | 1 | 131 | `lang` |
| `RapidOcrOptions` | 14 | 152-240 | `lang`, `backend`, `text_score`, `use_det`, `use_cls`, `use_rec`, `print_verbose`, `det_model_path`, `cls_model_path`, `rec_model_path`, `rec_keys_path`, `rec_font_path`, `font_path`, `rapidocr_params` |
| `EasyOcrOptions` | 7 | 258-312 | `lang`, `use_gpu`, `confidence_threshold`, `model_storage_directory`, `recog_network`, `download_enabled`, `suppress_mps_warnings` |
| `TesseractCliOcrOptions` | 4 | 331-358 | `lang`, `tesseract_cmd`, `path`, `psm` |
| `TesseractOcrOptions` | 3 | 376-394 | `lang`, `path`, `psm` |
| `OcrMacOptions` | 3 | 412-430 | `lang`, `recognition`, `framework` |
| `PictureDescriptionBaseOptions` | 6 | 447-494 | `batch_size`, `scale`, `picture_area_threshold`, `classification_allow`, `classification_deny`, `classification_min_confidence` |
| `PictureDescriptionApiOptions` | 7 | 510-566 | `url`, `headers`, `params`, `timeout`, `concurrency`, `prompt`, `provenance` |
| `PictureDescriptionVlmOptions` | 3 | 581-606 | `repo_id`, `prompt`, `generation_config` |
| `PipelineOptions` | 5 | 694-734 | `document_timeout`, `accelerator_options`, `enable_remote_services`, `allow_external_plugins`, `artifacts_path` |
| `ConvertPipelineOptions` | 3 | 750-768 | `do_picture_classification`, `do_picture_description`, `picture_description_options` |
| `PaginatedPipelineOptions` | 3 | 782-801 | `images_scale`, `generate_page_images`, `generate_picture_images` |
| `VlmPipelineOptions` | 3 | 815-833 | `generate_page_images`, `force_backend_text`, `vlm_options` |
| `BaseLayoutOptions` | 2 | 847-856 | `keep_empty_clusters`, `skip_cell_assignment` |
| `LayoutOptions` | 2 | 871-880 | `create_orphan_clusters`, `model_spec` |
| `AsrPipelineOptions` | 1 | 898 | `asr_options` |
| `VlmExtractionPipelineOptions` | 1 | 912 | `vlm_options` |
| `PdfPipelineOptions` | 18 | 940-1109 | `do_table_structure`, `do_ocr`, `do_code_enrichment`, `do_formula_enrichment`, `force_backend_text`, `table_structure_options`, `ocr_options`, `layout_options`, `images_scale`, `generate_page_images`, `generate_picture_images`, `generate_table_images`, `generate_parsed_pages`, `ocr_batch_size`, `layout_batch_size`, `table_batch_size`, `batch_polling_interval_seconds`, `queue_max_size` |

---

### Appendix F: Backend Label Occurrences from Source

#### F.1 Backend Occurrence Rollup (per file, with frequencies)

This replaces the 74-row occurrence list with a backend-centric rollup that still preserves count signals.

| Backend file | DocItemLabel refs | GroupLabel refs | Line span | DocItemLabel frequencies | GroupLabel frequencies |
|---|---:|---:|---|---|---|
| `ref-repos/docling/docling/backend/asciidoc_backend.py` | 5 | 2 | 112-258 | `TITLE`, `CAPTION(2)`, `PARAGRAPH(2)` | `LIST(2)` |
| `ref-repos/docling/docling/backend/html_backend.py` | 4 | 5 | 451-1318 | `TEXT(3)`, `CAPTION` | `UNSPECIFIED`, `INLINE`, `SECTION(3)` |
| `ref-repos/docling/docling/backend/md_backend.py` | 2 | 0 | 357-442 | `CAPTION`, `TEXT` | — |
| `ref-repos/docling/docling/backend/msexcel_backend.py` | 1 | 1 | 237-306 | `TEXT` | `SECTION` |
| `ref-repos/docling/docling/backend/mspowerpoint_backend.py` | 7 | 1 | 486-734 | `LIST_ITEM`, `PARAGRAPH`, `TITLE(2)`, `SECTION_HEADER(2)`, `TEXT` | `CHAPTER` |
| `ref-repos/docling/docling/backend/msword_backend.py` | 9 | 8 | 277-1756 | `TEXT(6)`, `TITLE`, `FORMULA(2)` | `SECTION(5)`, `UNSPECIFIED`, `PICTURE_AREA`, `COMMENT_SECTION` |
| `ref-repos/docling/docling/backend/webvtt_backend.py` | 1 | 0 | 171 | `TEXT` | — |
| `ref-repos/docling/docling/backend/xml/jats_backend.py` | 10 | 4 | 316-815 | `TEXT(4)`, `PARAGRAPH(2)`, `FORMULA`, `CAPTION(2)`, `TITLE` | `LIST(4)` |
| `ref-repos/docling/docling/backend/xml/uspto_backend.py` | 14 | 0 | 410-1356 | `PARAGRAPH(13)`, `TITLE` | — |

#### F.2 Hotspot Signals

| Signal type | Backends | Interpretation |
|---|---|---|
| Strong repeated paragraph emission | `xml/uspto_backend.py` (`PARAGRAPH(13)`) | USPTO backend is paragraph-dominant; title is sparse. |
| Strong repeated text emission | `msword_backend.py` (`TEXT(6)`), `html_backend.py` (`TEXT(3)`), `xml/jats_backend.py` (`TEXT(4)`) | Text-heavy backends should be treated as default text-item producers. |
| Repeated structural grouping | `msword_backend.py` (`SECTION(5)`), `xml/jats_backend.py` (`LIST(4)`), `html_backend.py` (`SECTION(3)`) | GroupLabel persistence is high value for hierarchy reconstruction. |

---

### Appendix G: Backend Label Sets (Unique)

| File | DocItemLabel set | GroupLabel set |
|---|---|---|
| ref-repos/docling/docling/backend/asciidoc_backend.py | CAPTION, PARAGRAPH, TITLE | LIST |
| ref-repos/docling/docling/backend/html_backend.py | CAPTION, TEXT | INLINE, SECTION, UNSPECIFIED |
| ref-repos/docling/docling/backend/md_backend.py | CAPTION, TEXT |  |
| ref-repos/docling/docling/backend/msexcel_backend.py | TEXT | SECTION |
| ref-repos/docling/docling/backend/mspowerpoint_backend.py | LIST_ITEM, PARAGRAPH, SECTION_HEADER, TEXT, TITLE | CHAPTER |
| ref-repos/docling/docling/backend/msword_backend.py | FORMULA, TEXT, TITLE | COMMENT_SECTION, PICTURE_AREA, SECTION, UNSPECIFIED |
| ref-repos/docling/docling/backend/webvtt_backend.py | TEXT |  |
| ref-repos/docling/docling/backend/xml/jats_backend.py | CAPTION, FORMULA, PARAGRAPH, TEXT, TITLE | LIST |
| ref-repos/docling/docling/backend/xml/uspto_backend.py | PARAGRAPH, TITLE |  |

### Appendix H: Backend Label Sets (Unique)

All tables below are keyed by the 15 Docling `InputFormat` enum values. Every format appears in every table. These consolidate data scattered across Sections 2-14 and Appendixes A-G into format-centric lookup tables.

### Supertable A: Format → Pipeline, Backend, and Capabilities

| InputFormat | Pipeline | Backend | BackendOptions | OCR | TableStruct | CodeEnrich | FormulaEnrich | PicClass | PicDesc | ASR | prov | bbox | page_no | confidence | formatting | hyperlink | embedded_img | timestamps |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `pdf` | StandardPdfPipeline | DoclingParseV4DocumentBackend | PdfBackendOptions | Y | Y | Y | Y | Y | Y | N | Y | Y | Y | Y | N | N | N | N |
| `image` | StandardPdfPipeline | ImageDocumentBackend | DeclarativeBackendOptions | Y | Y | Y | Y | Y | Y | N | Y | Y | Y | Y | N | N | N | N |
| `mets_gbs` | StandardPdfPipeline | MetsGbsDocumentBackend | DeclarativeBackendOptions | Y | Y | Y | Y | Y | Y | N | Y | Y | Y | Y | N | N | N | N |
| `docx` | SimplePipeline | MsWordDocumentBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | N | N | N | N | Y | N | Y | N |
| `pptx` | SimplePipeline | MsPowerpointDocumentBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | Y | Y | Y | N | N | N | N | N |
| `html` | SimplePipeline | HTMLDocumentBackend | HTMLBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | Y | P | N |
| `md` | SimplePipeline | MarkdownDocumentBackend | MarkdownBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | N | P | N |
| `asciidoc` | SimplePipeline | AsciiDocBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | N | N | N |
| `csv` | SimplePipeline | CsvDocumentBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | N | N | N |
| `xlsx` | SimplePipeline | MsExcelDocumentBackend | MsExcelBackendOptions | N | N | N | N | P | P | N | Y | Y | Y | N | N | N | P | N |
| `xml_uspto` | SimplePipeline | PatentUsptoDocumentBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | N | N | N |
| `xml_jats` | SimplePipeline | JatsDocumentBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | N | N | N |
| `json_docling` | SimplePipeline | DoclingJSONBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | * | * | * | N | * | * | * | N |
| `audio` | AsrPipeline | NoOpBackend | DeclarativeBackendOptions | N | N | N | N | N | N | Y | N | N | N | N | N | N | N | Y |
| `vtt` | SimplePipeline | WebVTTDocumentBackend | DeclarativeBackendOptions | N | N | N | N | P | P | N | N | N | N | N | N | N | N | N |

Legend: `Y` = available/populated by default, `P` = possible (depends on config or content), `N` = not applicable, `*` = depends on source DoclingDocument being re-imported.

### Supertable B: Format → MIME Types and File Extensions

| InputFormat | Primary MIME | Additional MIMEs | File Extensions |
|---|---|---|---|
| `pdf` | `application/pdf` | — | pdf |
| `image` | `image/png` | `image/jpeg`, `image/tiff`, `image/gif`, `image/bmp`, `image/webp` | jpg, jpeg, png, tif, tiff, bmp, webp |
| `mets_gbs` | `application/mets+xml` | — | tar.gz |
| `docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `...wordprocessingml.template` | docx, dotx, docm, dotm |
| `pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `...presentationml.template`, `...presentationml.slideshow` | pptx, potx, ppsx, pptm, potm, ppsm |
| `html` | `text/html` | `application/xhtml+xml` | html, htm, xhtml |
| `md` | `text/markdown` | `text/x-markdown` | md |
| `asciidoc` | `text/asciidoc` | — | adoc, asciidoc, asc |
| `csv` | `text/csv` | — | csv |
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | — | xlsx, xlsm |
| `xml_uspto` | `application/xml` | `text/plain` | xml, txt |
| `xml_jats` | `application/xml` | — | xml, nxml |
| `json_docling` | `application/json` | — | json |
| `audio` | `audio/wav` | `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/m4a`, `audio/aac`, `audio/ogg`, `audio/flac`, `audio/x-flac`, `audio/x-wav`, `video/mp4`, `video/avi`, `video/x-msvideo`, `video/quicktime` | wav, mp3, m4a, aac, ogg, flac, mp4, avi, mov |
| `vtt` | `text/vtt` | — | vtt |

### Supertable C: Format → DocItemLabels (full 23-label enum)

Columns: full `DocItemLabel` enum from `docling-core >=2.62.0` (23 labels). Source: groundtruth corpus mapped from MIME to InputFormat; formats without corpus coverage use backend source labels (Appendix G).

| InputFormat | caption | chart | checkbox_sel | checkbox_unsel | code | doc_index | empty_value | footnote | form | formula | grading_scale | handwritten_text | key_value_region | list_item | page_footer | page_header | paragraph | picture | reference | section_header | table | text | title |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `pdf` | Y | | Y | Y | Y | Y | | Y | | Y | | | | Y | Y | Y | | Y | | Y | Y | Y | |
| `image` | Y | | Y | Y | Y | Y | | Y | | Y | | | | Y | Y | Y | | Y | | Y | Y | Y | |
| `mets_gbs` | Y | | Y | Y | Y | Y | | Y | | Y | | | | Y | Y | Y | | Y | | Y | Y | Y | |
| `docx` | | | | | | | | | | Y | | | | Y | | | Y | Y | | Y | Y | Y | Y |
| `pptx` | | | | | | | | | | | | | | Y | | | Y | Y | | Y | Y | Y | Y |
| `html` | Y | | | | Y | | | | | | | | | Y | | | | Y | | Y | Y | Y | Y |
| `md` | Y | | | | | | | | | | | | | | | | | Y | | Y | Y | Y | Y |
| `asciidoc` | Y | | | | | | | | | | | | | | | | Y | | | | | | Y |
| `csv` | | | | | | | | | | | | | | | | | | | | | Y | | |
| `xlsx` | | | | | | | | | | | | | | | | | | Y | | | Y | Y | |
| `xml_uspto` | | | | | | | | | | | | | | | | | Y | | | Y | Y | | Y |
| `xml_jats` | Y | | | | | | | | | Y | | | | Y | | | Y | Y | | Y | Y | Y | Y |
| `json_docling` | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * | * |
| `audio` | | | | | | | | | | | | | | | | | | | | | | Y | |
| `vtt` | | | | | | | | | | | | | | | | | | | | | | Y | |

Legend: `Y` = observed in corpus or emitted by backend source, blank = defined in enum but not observed for this format, `*` = depends on source DoclingDocument being re-imported.

Notes:
1. `pdf`/`image`/`mets_gbs` share the same label universe (StandardPdfPipeline + layout model).
2. `pptx` — FOOTNOTE removed (was false positive: line 567 is a comment, actual code uses SECTION_HEADER).
3. `xml_jats` — FOOTNOTE removed (was false positive: line 524 is a TODO comment with commented-out code).
4. `asciidoc` labels from backend source only (CAPTION, PARAGRAPH, TITLE).
5. `xml_uspto` backend emits only PARAGRAPH and TITLE; corpus confirms paragraph, section_header, title.
6. 7 labels never observed: chart, empty_value, form, grading_scale, handwritten_text, key_value_region, reference. These exist in the enum for future or specialized use.
6. `xlsx` backend emits TEXT; corpus shows picture and table. Section groups carry the sheet structure.

### Supertable D: Format → GroupLabels (full 12-label enum)

Columns: full `GroupLabel` enum from `docling-core >=2.62.0` (12 labels).

| InputFormat | chapter | comment_section | form_area | inline | key_value_area | list | ordered_list | picture_area | section | sheet | slide | unspecified |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `pdf` | | | Y | | Y | Y | | | | | | |
| `image` | | | Y | | Y | Y | | | | | | |
| `mets_gbs` | | | Y | | Y | Y | | | | | | |
| `docx` | | Y | | Y | | Y | | Y | Y | | | Y |
| `pptx` | Y | | | | | Y | | | | | | |
| `html` | | | | Y | | Y | | | Y | | | Y |
| `md` | | | | | | | | | | | | |
| `asciidoc` | | | | | | Y | | | | | | |
| `csv` | | | | | | | | | | | | |
| `xlsx` | | | | | | | | | Y | | | |
| `xml_uspto` | | | | | | | | | | | | |
| `xml_jats` | | | | | | Y | | | | | | |
| `json_docling` | * | * | * | * | * | * | * | * | * | * | * | * |
| `audio` | | | | | | | | | | | | |
| `vtt` | | | | Y | | | | | | | | |

Legend: `Y` = observed in corpus or emitted by backend source, blank = defined in enum but not observed for this format, `*` = depends on source DoclingDocument.

Notes:
1. 3 labels never observed: ordered_list (backends use `list` for all list types), sheet (Excel backend uses `section`), slide (PowerPoint backend uses `chapter`).
2. Enum may grow in future docling-core versions.

