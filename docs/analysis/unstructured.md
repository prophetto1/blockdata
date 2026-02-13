# Unstructured.io open-source document processing: a complete technical deep-dive

**Unstructured.io provides an Apache 2.0-licensed Python library for converting 48+ document formats into structured elements, paired with a separate ingest framework offering 70+ connectors — but its most capable models and several chunking strategies are locked behind a proprietary hosted API.** This report delivers engineering-level detail across the full ecosystem: licensing, architecture, partitioning strategies, element models, chunking, I/O formats, connectors, and deployment. The analysis is intended to support a direct comparison with the proprietary BlockData system.

---

## 1. Licensing is Apache 2.0 throughout, with a clear open/proprietary boundary

Both core packages — `unstructured` (v0.18.32) and `unstructured-ingest` (v1.2.40) — are confirmed **Apache 2.0** on PyPI and in their GitHub LICENSE files. The `unstructured-inference` layout detection library (v1.2.0) and the self-hostable `unstructured-api` wrapper also carry Apache 2.0 licenses. Client SDKs (`unstructured-python-client`, `unstructured-js-client`) use **MIT** licenses.

The Unstructured-IO GitHub org hosts **41 public repositories**. The core four are actively maintained: `unstructured` (~14k stars), `unstructured-ingest` (106 stars), `unstructured-inference` (202 stars), and `unstructured-api` (875 stars). Supporting repos include `base-images` (Docker/Packer build infrastructure), `unstructured-platform-plugins`, `unstructured-eval-metrics`, `docs`, and `notebooks`. The org also maintains forks of PaddleOCR and pytesseract, plus several archived pipeline repos (`pipeline-sec-filings`, `pipeline-template`, `pipeline-oer`).

**What is proprietary:** The Unstructured Platform SaaS (accessible at `platform.unstructured.io`) and hosted API are closed-source commercial products. Specific proprietary components include:

- **Chipper model** (v1–v3): Unstructured's in-house vision transformer for document understanding. Weights are private on HuggingFace; only accessible via the hosted API.
- **layout_v1.0.0 and layout_v1.1.0**: Proprietary layout detection models used by the API service, outperforming the open-source alternatives.
- **Fine-tuned OCR models**: Custom OCR not available in OSS.
- **VLM-based partition strategy**: Uses 10+ vision-language models (Claude, GPT, Gemini) for partitioning — API-only.
- **by_page and by_similarity chunking**: Not in the open-source library.
- **Enrichments**: Generative OCR, image description, table description, named entity recognition.
- **Image extraction from office documents**: Locked behind the paid API.
- **Incremental data loading, scheduling, RBAC, compliance certifications** (SOC 2, HIPAA, GDPR, ISO 27001, FedRAMP).

**Telemetry note:** The open-source library ships with Scarf analytics enabled by default — a lightweight ping on library load that collects anonymized usage data including organizational information. Opt out by setting `DO_NOT_TRACK=true` or `SCARF_NO_ANALYTICS=true`. According to a Scarf case study, Unstructured uses this data to identify Fortune 500 users for sales purposes.

**Pricing:** The hosted API offers a "Let's Go" free tier (**15,000 lifetime pages**), Pay-As-You-Go at **$0.03/page**, and custom Business plans. One page equals one PDF page, one PPTX slide, or 100 KB for other formats.

---

## 2. Architecture splits core parsing from ETL orchestration

The ecosystem follows a clean two-library design. The `unstructured` package is the **core parsing engine**: it transforms raw documents into typed `Element` objects via format-specific partitioners, applies chunking, and serializes output. It has zero awareness of cloud storage, connectors, or batch orchestration. The `unstructured-ingest` package is the **ETL orchestration layer**: it wraps the core library and adds source/destination connectors, pipeline coordination, download management, and batch processing.

### The 11-step ingest pipeline

The full pipeline in `unstructured-ingest` is a **sequential (linear) pipeline** — not a DAG — with per-step parallelism:

| Step | Input | Output | Parallelism |
|------|-------|--------|-------------|
| **1. Index** | Source location (S3 path, local dir, etc.) | Document metadata catalog | Single process |
| **2. Post-index filter** | Document metadata | Filtered document list | Single process |
| **3. Download** | Filtered list | Local files on disk | Async (remote) |
| **4. Post-download filter** | Downloaded files | Filtered files | Single process |
| **5. Uncompress** (optional) | ZIP/TAR files | Extracted files | Single process |
| **6. Post-uncompress filter** | Extracted files | Filtered files | Single process |
| **7. Partition** | Local files | `list[Element]` as JSON | Multiprocessing (local) or async (API) |
| **8. Chunk** (optional) | Elements | Chunked elements | Same as partition |
| **9. Embed** (optional) | Chunked elements | Elements with `embeddings` vectors | Async (API) or multiprocessing (local HF) |
| **10. Stage** (optional) | Elements in JSON | Reformatted for destination | Single process |
| **11. Upload** | Final elements | Written to destination | Async (if non-batch) |

Intermediate results are cached to `work_dir` (default `~/.cache/unstructured/ingest/pipeline/`), enabling fault-tolerant resumption. The `ProcessorConfig` controls global behavior: `num_processes` (default **2**), `max_connections`, `reprocess`, `max_docs`, `preserve_downloads`.

### Hosted API vs. open-source library

The self-hostable API (`unstructured-api` repo) wraps the open-source library behind a FastAPI endpoint at `/general/v0/general` — it offers the same capabilities as the OSS library with no proprietary models. The hosted API at `api.unstructuredapp.io` runs significantly more capable proprietary models and provides features unavailable locally: intelligent per-page model routing, VLM partitioning, by_similarity chunking, image extraction, enrichments, and managed parallelization. The `unstructured` library can call the hosted API via `partition_via_api()` or by setting `partition_by_api=True` in the ingest pipeline config.

---

## 3. Partitioning is the core intelligence layer

### How auto-detection works

The universal entry point `partition()` in `unstructured.partition.auto` uses **libmagic** for MIME-type detection, falling back to file extension matching. The internal `_FileTypeDetector` maps detected MIME types to a `FileType` enum, which routes to the correct format-specific partitioner. Users can bypass detection with the `content_type` parameter.

**Per-format partitioners** exist for 18+ formats: `partition_pdf`, `partition_image`, `partition_docx`, `partition_doc`, `partition_odt`, `partition_pptx`, `partition_ppt`, `partition_xlsx`, `partition_csv`, `partition_tsv`, `partition_html`, `partition_xml`, `partition_email` (EML), `partition_msg`, `partition_rtf`, `partition_epub`, `partition_md`, `partition_text`, `partition_rst`, `partition_org`.

### Four partitioning strategies

| Strategy | How it works | Speed | When to use |
|----------|-------------|-------|-------------|
| **`auto`** (default) | Adaptively selects strategy per document. For PDFs: uses `fast` if text is extractable with no tables; `hi_res` if tables/images detected; `ocr_only` if text not extractable. Images always get `hi_res`. | Varies | General-purpose default |
| **`fast`** | Direct text extraction via pdfminer (PDFs) or native parsers. Rule-based NLP classifies elements. ~100x faster than hi_res. | Fastest | Text-heavy PDFs, structured formats |
| **`hi_res`** | Object detection model identifies layout regions, then text is extracted per-region with OCR fallback. Best accuracy. | Slowest | Complex layouts, tables, mixed content |
| **`ocr_only`** | Full-page OCR via Tesseract/PaddleOCR, then text passed to `partition_text` for classification. | Medium | Scanned documents, image-only PDFs |

### PDF hi_res pipeline in detail

The `hi_res` strategy for PDFs executes a 6-step sequence through the `unstructured-inference` library:

1. **Page rendering**: PDF pages converted to images via `pypdfium2`
2. **Layout detection**: An object detection model produces bounding boxes with category labels (Title, Table, Figure, Text, List-item, Section-header, Caption, Page-header, Page-footer)
3. **Text extraction**: PDFMiner extracts embedded text with coordinates
4. **Layout merging**: `merge_inferred_with_extracted_layout()` combines model detections with PDFMiner output using a 5-rule algorithm
5. **OCR gap-fill**: Tesseract or PaddleOCR processes regions where embedded text is absent
6. **Spatial ordering**: XY-cut algorithm orders elements on the page

**Layout detection models available locally:** YOLOX (Apache 2.0, ONNX-based, from Megvii), `yolox_quantized` (faster variant), and `detectron2_onnx` (Faster R-CNN R50-FPN-3x pretrained on DocLayNet, legacy). The default local model is `detectron2_onnx`, controlled via `hi_res_model_name` parameter or `UNSTRUCTURED_HI_RES_MODEL_NAME` env var. The hosted API defaults to the proprietary `layout_v1.1.0`.

**OCR engines:** Tesseract (default), PaddleOCR, and Google Cloud Vision — selected via the `OCR_AGENT` environment variable.

### Element classification uses heuristics, not ML

For `fast` and `ocr_only` strategies, element type classification is **purely rule-based** via `unstructured.partition.text_type`: `is_possible_title()` checks length, capitalization ratio, and punctuation; `is_possible_narrative_text()` uses NLTK's `sent_tokenize` to verify multi-sentence prose; `is_bulleted_text()` matches Unicode bullet patterns; regex detects addresses and email addresses. For `hi_res`, the layout detection model directly outputs category labels that are mapped to Element types via `TYPE_TO_TEXT_ELEMENT_MAP`. For structured formats (DOCX, PPTX, HTML), document semantics drive classification — Word paragraph styles, HTML tags, and slide layouts map directly to element types.

---

## 4. The Element model provides rich typed document structure

### Element type hierarchy

The base `Element` class branches into `Text` (with **17 subtypes**) and `CheckBox`:

| Element Type | Meaning | Created By |
|---|---|---|
| `Title` | Section headers, document titles | All strategies |
| `NarrativeText` | Well-formed paragraphs | All strategies |
| `ListItem` | Bulleted or numbered list items | All strategies |
| `Table` | Tabular data (HTML in `text_as_html`) | hi_res, format-specific |
| `Image` | Image references/metadata | hi_res |
| `Header` / `Footer` | Page headers/footers | hi_res, DOCX |
| `FigureCaption` | Image/figure captions | hi_res |
| `Formula` | Mathematical formulas | hi_res |
| `Address` | Physical addresses | Text heuristics |
| `EmailAddress` | Email addresses | Text heuristics |
| `PageBreak` | Page break markers | Format-specific |
| `CodeSnippet` | Source code blocks | Format-specific |
| `PageNumber` | Page number text | hi_res |
| `UncategorizedText` | Unclassified text | Fallback |
| `CompositeElement` | Merged chunks (chunking only) | Chunking stage |
| `FormKeysValues` | Form key-value pairs | Format-specific |
| `CheckBox` (`Checked`/`Unchecked`) | Form checkboxes | Format-specific |

### ElementMetadata fields

Every element carries an `ElementMetadata` object with these key fields:

**Universal fields:** `filename`, `file_directory`, `filetype` (MIME), `page_number` (1-indexed), `last_modified` (ISO format), `languages` (detected list), `parent_id` (hierarchy), `category_depth`, `element_id` (SHA-256 hash or UUID).

**Spatial fields:** `coordinates` contains a `CoordinatesMetadata` with `points` (bounding box corners in pixel space) and `system` (a `PixelSpace` with width, height, orientation).

**Content-enrichment fields:** `text_as_html` (HTML table representation), `table_as_cells` (cell-level structure), `links`/`link_urls`/`link_texts`, `emphasized_text_contents`/`emphasized_text_tags`, `image_path`, `section`, `detection_class_prob` (model confidence), `regex_metadata`.

**Email-specific:** `sent_from`, `sent_to`, `cc_recipient`, `bcc_recipient`, `subject`, `email_message_id`, `signature`.

**Data source tracking:** `DataSourceMetadata` captures `url`, `version`, `record_locator`, `date_created`, `date_modified`, `date_processed`, `permissions_data`.

During chunking, metadata fields follow consolidation strategies: coordinates and confidence scores are **dropped**, filename and page_number take the **first** element's value, `text_as_html` is **concatenated**, link lists are **concatenated**, and languages are **deduplicated**.

---

## 5. Chunking supports both character and token limits

### Two open-source strategies, two API-only strategies

**`basic`** combines sequential elements to fill chunks up to `max_characters` (hard max, default **500**). The `new_after_n_chars` parameter (soft max, defaults to `max_characters`) triggers a new chunk when exceeded — the next element starts a fresh chunk. A single element exceeding the hard max is isolated and text-split across multiple chunks. The `overlap` parameter (default **0**) prepends characters from the prior chunk's end to text-split chunks; setting `overlap_all=True` applies overlap between all chunks.

**`by_title`** inherits all `basic` behavior and adds section awareness: a `Title` element always starts a new chunk, closing the prior one. The `multipage_sections` parameter (default `True`) controls whether page breaks force new chunks. The `combine_text_under_n_chars` parameter (defaults to `max_characters`) merges small sequential sections to avoid tiny chunks — set to `0` to disable.

**`by_page`** (API-only) ensures content from different pages never shares a chunk. **`by_similarity`** (API-only) uses the `sentence-transformers/multi-qa-mpnet-base-dot-v1` embedding model with a `similarity_threshold` (default **0.5**) to group topically similar sequential elements.

### Table handling during chunking

**Tables are always isolated** — they are never combined with adjacent non-Table elements. A Table fitting within `max_characters` becomes a single chunk. An oversized Table is text-split into multiple `TableChunk` elements. After chunking, the output consists exclusively of three types: `CompositeElement` (merged text), `Table` (intact), and `TableChunk` (split table fragments). Original pre-chunking elements are preserved in `.metadata.orig_elements` (Base64 gzipped JSON).

### Token-based chunking exists in OSS (with explicit configuration)

Open-source chunking includes token-aware controls in the chunking API (`max_tokens`, `new_after_n_tokens`, `tokenizer`) alongside character controls. In practice, many examples and defaults are still character-oriented (`max_characters=500`), but token-aware chunking is available when explicitly configured. The **Contextual Chunking** feature (Platform-only) still refers to a separate managed enrichment behavior.

---

## 6. Input format support spans 48 extensions, but JSON has a critical limitation

### Complete supported format list

The library supports **48 file extensions** across these categories: PDF (`.pdf`), Images (`.bmp`, `.heic`, `.jpeg`, `.jpg`, `.png`, `.prn`, `.tiff`), Word Processing (`.abw`, `.doc`, `.docx`, `.dot`, `.dotm`, `.hwp`, `.zabw`), PowerPoint (`.pot`, `.ppt`, `.pptm`, `.pptx`), Spreadsheets (`.csv`, `.et`, `.fods`, `.mw`, `.tsv`, `.xls`, `.xlsx`), Email (`.eml`, `.msg`, `.p7s`), Markup (`.htm`, `.html`, `.md`, `.rst`, `.xml`, `.org`), Rich Text (`.rtf`), E-book (`.epub`), OpenOffice (`.odt`), Plain Text (`.txt`), and legacy/niche formats (`.cwk`, `.dbf`, `.dif`, `.eth`, `.mcw`, `.pbd`, `.sdp`, `.sxg`). The hosted Platform claims 60+ types including audio/video (`.mp3`, `.mp4`, `.wav`) not available in OSS.

### JSON input: only accepts Unstructured's own output schema

This is a **critical finding for comparison with BlockData**: `partition_json` exists but does **not** accept arbitrary JSON. Passing a generic JSON file like `{"id": 1234, "description": "test"}` raises `ValueError: Detected a JSON file that does not conform to the Unstructured schema. partition_json currently only processes serialized Unstructured output.` The accepted format is a JSON array of element dictionaries with `type`, `element_id`, `text`, and `metadata` keys — i.e., re-ingesting previously partitioned output. Nested JSON objects, arbitrary keys, and depth-variable structures are all rejected. An open feature request (GitHub Issue #1038) to support arbitrary JSON remains unimplemented.

**NDJSON input** has the identical limitation — `partition_ndjson` only accepts Unstructured schema-compliant newline-delimited JSON.

**Not supported at all:** YAML, WAV/audio (OSS only — audio supported in Platform), video.

### Format-specific dependencies and quirks

PDF requires `poppler-utils` + `tesseract-ocr`. DOC (legacy Word) requires LibreOffice for conversion. EPUB, ODT, and RTF require `pandoc` ≥ 2.14.2. Images require Tesseract for OCR. XML supports an `xml_keep_tags` parameter to preserve tag structure. XLSX treats each sheet as a separate `page_name` in metadata. PPTX includes slide notes by default (`include_slide_notes=True`). HTML accepts URLs directly, not just files. The DIF format (`.dif`) only supports `\n` line endings — `\r\n` raises an error.

---

## 7. Output is a flat JSON array with optional CSV and staging transforms

### JSON output schema

The primary output is a **flat array of element dictionaries** — not nested documents. Each element follows this structure:

```json
[
  {
    "type": "NarrativeText",
    "element_id": "5ef1d1117721f0472c1ad825991d7d37",
    "text": "The extracted text content of this element.",
    "metadata": {
      "filename": "report.pdf",
      "filetype": "application/pdf",
      "page_number": 1,
      "languages": ["eng"],
      "parent_id": "56f24319ae258b735cac3ec2a271b1d9",
      "coordinates": {
        "points": [[72.0, 85.3], [72.0, 100.1], [520.4, 100.1], [520.4, 85.3]],
        "system": {"type": "PixelSpace", "width": 612, "height": 792}
      },
      "text_as_html": null,
      "last_modified": "2024-05-01T14:15:22"
    },
    "embeddings": [0.023, -0.041, 0.118, ...]
  }
]
```

Output field control is available via `fields_include` (default: `element_id`, `text`, `type`, `metadata`, `embeddings`), `flatten_metadata` (moves metadata fields to top level), and `metadata_exclude`/`metadata_include` filters.

**CSV output** is supported via the API with `output_format="text/csv"` and programmatically via `convert_to_csv()`. **NDJSON output** is not a native primary output option, though the Prodigy staging function can produce JSONL. Programmatic serialization helpers include `elements_to_json()`, `elements_from_json()`, `convert_to_dict()`, and `convert_to_dataframe()` (pandas).

### The staging module formats output for 9 downstream systems

The `unstructured.staging` module (now deprecated in favor of destination connectors) provides formatting functions for: **Label Studio** (NLP annotation with predictions/annotations), **Prodigy** (Explosion AI, JSON and CSV), **Argilla** (text/token classification, text2text), **LabelBox** (cloud-hosted labeling), **Datasaur** (token-based labeling with entity support), **Baseplate** (LLM backend), **Weaviate** (vector DB with schema creation helper), **HuggingFace Transformers** (token-aware splitting by attention window), plus general CSV, DataFrame, and dict converters.

---

## 8. Seventy-plus connectors cover the major cloud and data ecosystem

### 35 source connectors in the open-source ingest library

Cloud storage: **S3**, **Google Cloud Storage**, **Azure Blob Storage**, **Box**, **Dropbox**, **OneDrive**, **SFTP**. Collaboration platforms: **Google Drive**, **SharePoint**, **Confluence**, **Notion**, **Slack**, **Discord**, **Jira**, **Outlook**, **Zendesk**, **Salesforce**, **Airtable**. Code repositories: **GitHub**, **GitLab**. Databases: **PostgreSQL**, **MongoDB**, **Elasticsearch**, **OpenSearch**, **Couchbase**, **SingleStore**, **SQLite**, **Snowflake**, **Teradata**. Data platforms: **Databricks Volumes**, **Delta Table**, **Kafka**, **Astra DB**. Local: **Local filesystem**.

### 36 destination connectors

Vector databases: **Pinecone**, **Weaviate**, **Chroma**, **Milvus** (incl. Zilliz Cloud), **Qdrant**, **LanceDB**, **Vectara**, **KDB.AI**, **Redis**. Search engines: **Elasticsearch**, **OpenSearch**, **Azure AI Search**. Graph: **Neo4j**. Relational/analytical: **PostgreSQL**, **SQLite**, **Snowflake**, **DuckDB**, **MotherDuck**, **SingleStore**, **Teradata**. Document/NoSQL: **MongoDB**, **Couchbase**. Cloud storage: **S3**, **GCS**, **Azure Blob**, **Box**, **Dropbox**, **OneDrive**, **SFTP**. Data platforms: **Databricks Volumes**, **Delta Tables (S3)**, **Delta Tables (Databricks)**, **Kafka**, **IBM watsonx.data**. Local: **Local filesystem**. Unstructured claims these enable **1,250+ unique pipeline combinations**.

### 9 embedding providers

| Provider | Default Model | Notes |
|----------|--------------|-------|
| **OpenAI** | `text-embedding-ada-002` | Most common |
| **HuggingFace** | `sentence-transformers/all-MiniLM-L6-v2` | Local inference, multiprocessing |
| **Amazon Bedrock** | User-specified | AWS-native |
| **Google Vertex AI** | `text-embedding-05` | GCP-native |
| **Azure OpenAI** | User-specified | Azure-native |
| **Voyage AI** | User-specified | Retrieval-focused |
| **Mixedbread AI** | `mxbai-embed-large-v1` | Open-source model |
| **Together.ai** | `m2-bert-80M-32k-retrieval` | Long-context |
| **OctoAI** | `thenlper/gte-large` | Inference platform |

Embeddings are generated as a pipeline step after chunking, configured via `EmbedderConfig` or CLI flags. API-based providers run asynchronously; HuggingFace local models use multiprocessing. Each provider requires its own pip extra (e.g., `pip install "unstructured-ingest[embed-huggingface]"`).

---

## 9. Deployment ranges from pip install to managed cloud

### Local installation tiers

`pip install unstructured` provides the base package supporting TXT, HTML, XML, and email formats. File-type extras add specific format support: `pip install "unstructured[all-docs]"` enables all 48+ formats. Individual extras exist for `csv`, `docx`, `epub`, `image`, `md`, `odt`, `org`, `pdf`, `pptx`, `rst`, `rtf`, `tsv`, `xlsx`, plus `local-inference`, `paddleocr`, `chunking-tokens`, and `huggingface`. System dependencies required: `libmagic-dev` (filetype detection), `poppler-utils` + `tesseract-ocr` (PDF/images), `libreoffice` (legacy Office formats), `pandoc` ≥2.14.2 (EPUB/ODT/RTF).

### Docker and self-hosted API

Official Docker images are published to `downloads.unstructured.io/unstructured-io/unstructured` for both x86_64 and ARM64, tagged by commit hash and `latest`. The `unstructured-api` repo provides a self-hosted FastAPI server via Docker with configurable memory management (`UNSTRUCTURED_MEMORY_FREE_MINIMUM_MB`, default 2048 MB — returns HTTP 503 when memory is low) and optional authentication via `UNSTRUCTURED_API_KEY`.

### Concurrency and scaling

The ingest pipeline uses a **worker pool** model with `num_processes` (default 2) for multiprocessing-based steps and `max_connections` for async I/O steps. The Python SDK provides both sync `partition()` and async `partition_async()` methods. For large PDFs, client-side page splitting (`split_pdf_page=True`) distributes pages across up to **15 concurrent API requests** in batches of 2–20 pages. Incremental processing is supported via download caching (`re_download=False`) and result caching (`reprocess=False`). The Platform adds scheduling, change detection (only new/changed data synced), auto-scaling (AWS/Azure marketplace deployments), and managed parallelization.

**No public performance benchmarks exist** in the documentation, but Unstructured states their Serverless API provides "significantly increased performance" over the open-source library for document and table extraction.

---

## Conclusion: a capable OSS core with a widening proprietary gap

The Unstructured.io open-source ecosystem provides a genuinely functional document processing pipeline under Apache 2.0 — the partitioning engine handles 48+ formats, the element model is well-designed with rich metadata, and the connector ecosystem is extensive at 70+ integrations. Three facts matter most for the BlockData comparison. First, **JSON input support is effectively nonexistent** for arbitrary data — `partition_json` only re-ingests Unstructured's own output, which is a significant gap if BlockData handles structured data natively. Second, the **quality gap between OSS and hosted is substantial and growing**: proprietary vision transformers, VLM-based partitioning, semantic chunking, and enrichments are all API-only, and the ingest library documentation now states it is "not being actively updated" with new API features. Third, chunking defaults remain character-heavy (`max_characters` default 500), **but OSS also supports token-aware chunking** when configured with tokenizer + token limits. The strongest technical differentiators of the OSS library are its layout detection pipeline for PDFs (YOLOX/Detectron2 with OCR fallback), the typed Element model with spatial coordinates and hierarchy, and the breadth of source/destination connectors in the ingest framework.
