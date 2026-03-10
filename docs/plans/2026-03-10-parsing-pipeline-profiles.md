# Parsing Pipeline — Docling Integration

> 2026-03-10 — Docling as primary parsing backend, black-box integration.

## Deliverables (in order)

1. **Config schema in DB** — All of docling's config options as a `jsonb` column in Supabase + seed profiles
2. **Frontend config page** — All docling options visible, editable, saveable as profiles
3. **Conversion service + AI connections on GCP** — Docling running, models provisioned, reading configs from DB (deployed together)

---

## 1. Config Schema (jsonb)

One column: `pipeline_config jsonb` on `conversion_parsing`.
One reference table: `parsing_profiles` for saved presets.

The JSON mirrors docling's actual Pydantic field names exactly. Every field is optional — omitted fields use docling defaults.

### Format → Pipeline Mapping (automatic)

| Format | Pipeline | Backend | Configurable? |
|--------|----------|---------|---------------|
| PDF | StandardPdfPipeline | DoclingParseDocumentBackend | Yes — full config |
| IMAGE (jpg/png/tiff/webp/bmp) | StandardPdfPipeline | ImageDocumentBackend | Yes — full config |
| METS_GBS | StandardPdfPipeline | MetsGbsDocumentBackend | Yes — full config |
| DOCX | SimplePipeline | MsWordDocumentBackend | Enrichments only |
| PPTX | SimplePipeline | MsPowerpointDocumentBackend | Enrichments only |
| XLSX | SimplePipeline | MsExcelDocumentBackend | Enrichments only |
| HTML | SimplePipeline | HTMLDocumentBackend | Enrichments + backend opts |
| MD | SimplePipeline | MarkdownDocumentBackend | Enrichments + backend opts |
| CSV | SimplePipeline | CsvDocumentBackend | Enrichments only |
| ASCIIDOC | SimplePipeline | AsciiDocBackend | Enrichments only |
| LATEX | SimplePipeline | LatexDocumentBackend | Enrichments + backend opts |
| XML_JATS | SimplePipeline | JatsDocumentBackend | Enrichments only |
| XML_USPTO | SimplePipeline | PatentUsptoDocumentBackend | Enrichments only |
| XML_XBRL | SimplePipeline | XBRLDocumentBackend | Enrichments + backend opts |
| JSON_DOCLING | SimplePipeline | DoclingJSONBackend | Enrichments only |
| VTT | SimplePipeline | WebVTTDocumentBackend | Enrichments only |
| AUDIO (wav/mp3/m4a/etc) | AsrPipeline | NoOpBackend | ASR options only |

User can force VlmPipeline for PDF/IMAGE instead of StandardPdfPipeline.

---

### Full jsonb Schema

```jsonc
{
  // ═══════════════════════════════════════════════════════════════════
  // GLOBAL OPTIONS (all pipelines)
  // ═══════════════════════════════════════════════════════════════════

  "pipeline": "standard",
  // "standard" | "vlm" | "asr"
  // Which pipeline to use for PDF/IMAGE. SimplePipeline formats ignore this.
  // Default: "standard"

  "document_timeout": null,
  // float | null — max seconds per document. null = no limit.

  "enable_remote_services": false,
  // Allow external API calls (VLM API mode, picture description API).

  "accelerator_options": {
    "device": "auto",          // "auto" | "cpu" | "cuda" | "mps"
    "num_threads": 4           // int
  },

  // ═══════════════════════════════════════════════════════════════════
  // STANDARD PDF PIPELINE OPTIONS
  // (applies to: PDF, IMAGE, METS_GBS)
  // ═══════════════════════════════════════════════════════════════════

  "pdf_pipeline": {

    // ─── OCR ──────────────────────────────────────────────────────
    "do_ocr": true,

    "ocr_options": {
      "kind": "auto",
      // "auto" | "easyocr" | "tesseract" | "tesserocr" | "rapidocr" | "ocrmac"

      "lang": [],
      // Language codes. Format varies by engine:
      //   easyocr:  ["en", "fr", "de", "es"]
      //   tesseract: ["eng", "fra", "deu", "spa"]
      //   rapidocr: ["english", "chinese"]
      //   ocrmac:   ["en-US", "fr-FR"]
      //   auto:     [] (engine decides)

      "force_full_page_ocr": false,
      // true = OCR entire page even if native text exists.

      "bitmap_area_threshold": 0.05,
      // 0.0-1.0 — fraction of page that must be bitmap to trigger OCR.

      // ── EasyOCR-specific (kind: "easyocr") ──
      "use_gpu": null,              // bool | null (null = auto-detect)
      "confidence_threshold": 0.5,  // float
      "model_storage_directory": null,
      "recog_network": "standard",
      "download_enabled": true,

      // ── Tesseract-specific (kind: "tesseract" or "tesserocr") ──
      "tesseract_cmd": "tesseract", // path to binary (CLI mode)
      "path": null,                 // tessdata directory
      "psm": null,                  // page segmentation mode (int)

      // ── RapidOCR-specific (kind: "rapidocr") ──
      "backend": "onnxruntime",     // "onnxruntime" | "openvino" | "paddle" | "torch"
      "text_score": 0.5,
      "print_verbose": false,

      // ── macOS Vision-specific (kind: "ocrmac") ──
      "recognition": "accurate",    // "accurate" | "fast"
      "framework": "vision"
    },

    // ─── Layout ───────────────────────────────────────────────────
    "layout_options": {
      "kind": "docling_layout_default",
      // "docling_layout_default" | "layout_object_detection"

      "model": "heron",
      // "heron" | "egret" | "egret_v2" | "egret_medium" | "egret_xlarge"

      "create_orphan_clusters": true,
      "keep_empty_clusters": false,
      "skip_cell_assignment": false
    },

    // ─── Table Structure ──────────────────────────────────────────
    "do_table_structure": true,

    "table_structure_options": {
      "kind": "docling_tableformer",
      "mode": "accurate",       // "fast" | "accurate"
      "do_cell_matching": true
    },

    // ─── Code & Formula Enrichment ────────────────────────────────
    "do_code_enrichment": false,
    "do_formula_enrichment": false,
    "code_formula_options": {
      "preset": "granite_docling",
      // Available presets: "granite_docling", "smoldocling", etc.
      "extract_code": true,
      "extract_formulas": true,
      "scale": 2.0,
      "max_size": null
    },

    // ─── Page/Image Generation ────────────────────────────────────
    "images_scale": 1.0,          // float — scaling for page images
    "generate_page_images": false, // generate PNG per page
    "generate_picture_images": false, // extract embedded images

    // ─── Text Handling ────────────────────────────────────────────
    "force_backend_text": false,
    // true = use PDF's native text layer instead of OCR/layout predictions.

    // ─── Threading (StandardPdfPipeline internal) ─────────────────
    "ocr_batch_size": 4,
    "layout_batch_size": 4,
    "table_batch_size": 4,
    "batch_polling_interval_seconds": 0.5,
    "queue_max_size": 100
  },

  // ═══════════════════════════════════════════════════════════════════
  // VLM PIPELINE OPTIONS
  // (applies when pipeline = "vlm", for PDF/IMAGE)
  // ═══════════════════════════════════════════════════════════════════

  "vlm_pipeline": {
    "vlm_options": {
      "preset": "granite_docling",
      // Available presets:
      //   "granite_docling" — IBM GraniteDocling (recommended)
      //   "smoldocling"     — lightweight
      //   "phi4"            — Phi-4 multimodal
      //   "granite_vision"  — Granite Vision 3.3-2B
      //   "pixtral"         — Pixtral
      //   "deepseek_ocr"    — DeepSeek OCR
      //   "got_ocr"         — GOT-OCR
      //   "qwen"            — Qwen VLM
      //   "gemma_12b"       — Gemma 12B
      //   "gemma_27b"       — Gemma 27B
      //   "dolphin"         — Dolphin

      "response_format": "doctags",
      // "doctags" | "markdown"

      "scale": 2.0,
      "max_size": null,
      "batch_size": 1
    },

    "force_backend_text": false,
    "images_scale": 1.0,
    "generate_page_images": true  // always true for VLM
  },

  // ═══════════════════════════════════════════════════════════════════
  // ASR PIPELINE OPTIONS
  // (applies to AUDIO formats)
  // ═══════════════════════════════════════════════════════════════════

  "asr_pipeline": {
    "asr_options": {
      "kind": "whisper_native",
      // "whisper_native" | "whisper_mlx"
      "preset": "whisper_tiny"
      // Available: whisper_tiny, whisper_small, whisper_medium, whisper_large
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENRICHMENTS
  // (applies to StandardPdfPipeline + SimplePipeline)
  // ═══════════════════════════════════════════════════════════════════

  "enrichments": {

    // ─── Picture Classification ───────────────────────────────────
    "do_picture_classification": false,
    "picture_classification_options": {
      // Classifies images as document-image vs photograph.
      // No user-facing options currently.
    },

    // ─── Picture Description ──────────────────────────────────────
    "do_picture_description": false,
    "picture_description_options": {
      "kind": "picture_description_vlm_engine",
      // "picture_description_vlm_engine" | "api" | "vlm" (legacy)

      "preset": "smolvlm",
      // VLM presets: "smolvlm", "granite_vision", "pixtral", etc.

      "prompt": "Describe this image in a few sentences.",
      "batch_size": 8,
      "scale": 2.0,
      "picture_area_threshold": 0.05,

      // ── API mode (kind: "api") ──
      "url": "http://localhost:8000/v1/chat/completions",
      "headers": {},
      "timeout": 20.0,
      "concurrency": 1
    },

    // ─── Chart Extraction ─────────────────────────────────────────
    "do_chart_extraction": false
    // Uses GraniteVision internally. No user-facing options.
  },

  // ═══════════════════════════════════════════════════════════════════
  // BACKEND OPTIONS (format-specific)
  // ═══════════════════════════════════════════════════════════════════

  "backend_options": {
    // Only relevant for formats with configurable backends.

    "html": {
      // HTMLBackendOptions — currently no documented user options
    },
    "markdown": {
      // MarkdownBackendOptions — currently no documented user options
    },
    "pdf": {
      // PdfBackendOptions — currently no documented user options
    },
    "latex": {
      // LatexBackendOptions — currently no documented user options
    },
    "xbrl": {
      // XBRLBackendOptions — currently no documented user options
    }
  }
}
```

---

## 2. Supabase Storage

### conversion_parsing table

Add one column:

```sql
ALTER TABLE conversion_parsing
  ADD COLUMN IF NOT EXISTS pipeline_config jsonb DEFAULT '{}';

COMMENT ON COLUMN conversion_parsing.pipeline_config IS
  'Docling pipeline configuration used for this conversion run. Mirrors docling Pydantic option field names. Omitted fields use docling defaults.';
```

### parsing_profiles table (new)

```sql
CREATE TABLE IF NOT EXISTS parsing_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  config      jsonb NOT NULL DEFAULT '{}',
  is_default  boolean NOT NULL DEFAULT false,
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE parsing_profiles IS
  'Saved pipeline configuration presets. is_system = built-in profiles shipped with the platform.';
```

### Seed profiles

```sql
INSERT INTO parsing_profiles (name, description, config, is_system, is_default) VALUES
(
  'Fast',
  'Basic text extraction. Best for clean, text-heavy documents.',
  '{
    "pdf_pipeline": {
      "ocr_options": { "kind": "tesseract", "lang": ["eng"] },
      "table_structure_options": { "mode": "fast" }
    },
    "enrichments": {}
  }',
  true, false
),
(
  'Balanced',
  'Good balance of quality and speed. Handles most documents well.',
  '{
    "pdf_pipeline": {
      "ocr_options": { "kind": "easyocr", "lang": ["en"] },
      "table_structure_options": { "mode": "fast" }
    },
    "enrichments": { "do_picture_classification": true }
  }',
  true, true
),
(
  'High Quality',
  'Best quality for complex documents with tables, charts, and mixed layouts.',
  '{
    "pdf_pipeline": {
      "ocr_options": { "kind": "easyocr", "lang": ["en"] },
      "table_structure_options": { "mode": "accurate" }
    },
    "enrichments": {
      "do_picture_classification": true,
      "do_picture_description": true,
      "do_chart_extraction": true
    }
  }',
  true, false
),
(
  'AI Vision',
  'Vision AI reads each page directly. Best for messy scans and complex layouts.',
  '{
    "pipeline": "vlm",
    "vlm_pipeline": {
      "vlm_options": { "preset": "granite_docling" }
    },
    "enrichments": { "do_picture_description": true }
  }',
  true, false
);
```

---

## 3. Conversion Service

### Translation layer: jsonb → DocumentConverter

```python
"""
Translate platform jsonb config → docling DocumentConverter.

The config JSON uses docling's actual Pydantic field names.
Omitted fields get docling defaults.
"""
from docling.document_converter import (
    DocumentConverter, PdfFormatOption, ImageFormatOption,
)
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions, EasyOcrOptions, TesseractCliOcrOptions,
    TesseractOcrOptions, RapidOcrOptions, OcrMacOptions, OcrAutoOptions,
    TableStructureOptions, TableFormerMode, LayoutOptions,
    AcceleratorOptions, AcceleratorDevice,
    VlmPipelineOptions, VlmConvertOptions,
)
from docling.pipeline.standard_pdf_pipeline import StandardPdfPipeline
from docling.pipeline.simple_pipeline import SimplePipeline
from docling.pipeline.vlm_pipeline import VlmPipeline
from docling.pipeline.asr_pipeline import AsrPipeline
from docling.datamodel.base_models import InputFormat

OCR_ENGINE_MAP = {
    "auto": OcrAutoOptions,
    "easyocr": EasyOcrOptions,
    "tesseract": TesseractCliOcrOptions,
    "tesserocr": TesseractOcrOptions,
    "rapidocr": RapidOcrOptions,
    "ocrmac": OcrMacOptions,
}

DEVICE_MAP = {
    "auto": AcceleratorDevice.AUTO,
    "cpu": AcceleratorDevice.CPU,
    "cuda": AcceleratorDevice.CUDA,
    "mps": AcceleratorDevice.MPS,
}


def build_converter(config: dict) -> DocumentConverter:
    """Build a DocumentConverter from a platform jsonb config dict."""

    pipeline_mode = config.get("pipeline", "standard")

    # ── Accelerator ──
    accel_cfg = config.get("accelerator_options", {})
    accel = AcceleratorOptions(
        device=DEVICE_MAP.get(accel_cfg.get("device", "auto"), AcceleratorDevice.AUTO),
        num_threads=accel_cfg.get("num_threads", 4),
    )

    # ── Standard PDF pipeline ──
    if pipeline_mode == "standard":
        pdf_cfg = config.get("pdf_pipeline", {})

        # OCR
        ocr_cfg = pdf_cfg.get("ocr_options", {})
        ocr_kind = ocr_cfg.get("kind", "auto")
        ocr_cls = OCR_ENGINE_MAP.get(ocr_kind, OcrAutoOptions)
        ocr_kwargs = {
            k: v for k, v in ocr_cfg.items()
            if k != "kind" and k in ocr_cls.model_fields
        }
        ocr_opts = ocr_cls(**ocr_kwargs)

        # Table structure
        table_cfg = pdf_cfg.get("table_structure_options", {})
        table_mode = (
            TableFormerMode.ACCURATE
            if table_cfg.get("mode", "accurate") == "accurate"
            else TableFormerMode.FAST
        )
        table_opts = TableStructureOptions(
            mode=table_mode,
            do_cell_matching=table_cfg.get("do_cell_matching", True),
        )

        # Enrichments
        enrich = config.get("enrichments", {})

        pipeline_options = PdfPipelineOptions(
            do_ocr=pdf_cfg.get("do_ocr", True),
            ocr_options=ocr_opts,
            layout_options=LayoutOptions(),
            do_table_structure=pdf_cfg.get("do_table_structure", True),
            table_structure_options=table_opts,
            do_code_enrichment=pdf_cfg.get("do_code_enrichment", False),
            do_formula_enrichment=pdf_cfg.get("do_formula_enrichment", False),
            do_picture_classification=enrich.get("do_picture_classification", False),
            do_picture_description=enrich.get("do_picture_description", False),
            do_chart_extraction=enrich.get("do_chart_extraction", False),
            images_scale=pdf_cfg.get("images_scale", 1.0),
            generate_page_images=pdf_cfg.get("generate_page_images", False),
            generate_picture_images=pdf_cfg.get("generate_picture_images", False),
            accelerator_options=accel,
            document_timeout=config.get("document_timeout"),
        )

        format_options = {
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=StandardPdfPipeline,
                pipeline_options=pipeline_options,
            ),
            InputFormat.IMAGE: ImageFormatOption(
                pipeline_cls=StandardPdfPipeline,
                pipeline_options=pipeline_options,
            ),
        }

    # ── VLM pipeline ──
    elif pipeline_mode == "vlm":
        vlm_cfg = config.get("vlm_pipeline", {})
        vlm_opts_cfg = vlm_cfg.get("vlm_options", {})
        preset = vlm_opts_cfg.get("preset", "granite_docling")

        vlm_convert = VlmConvertOptions.from_preset(preset)

        enrich = config.get("enrichments", {})

        pipeline_options = VlmPipelineOptions(
            vlm_options=vlm_convert,
            do_picture_classification=enrich.get("do_picture_classification", False),
            do_picture_description=enrich.get("do_picture_description", False),
            do_chart_extraction=enrich.get("do_chart_extraction", False),
            accelerator_options=accel,
            document_timeout=config.get("document_timeout"),
        )

        format_options = {
            InputFormat.PDF: PdfFormatOption(
                pipeline_cls=VlmPipeline,
                pipeline_options=pipeline_options,
            ),
            InputFormat.IMAGE: ImageFormatOption(
                pipeline_cls=VlmPipeline,
                pipeline_options=pipeline_options,
            ),
        }

    else:
        # Fallback: docling defaults
        format_options = {}

    return DocumentConverter(
        format_options=format_options,
    )
```

### Service file layout

```
services/
  docling-convert/
    converter.py       # build_converter() — jsonb → DocumentConverter
    main.py            # HTTP handler (FastAPI)
    requirements.txt   # docling + deps
```

### Request flow

```
User picks profile (or uses default) → clicks Run
  → POST /convert { source_uid, pipeline_config: {...} }
  → Edge function forwards to conversion service
  → build_converter(config) → converter.convert(source)
  → DoclingDocument result → callback with parsed blocks
  → pipeline_config saved to conversion_parsing.pipeline_config
```

---

## 4. AI Model Dependencies

| Component | Package | GPU? | Used By Profile |
|-----------|---------|------|-----------------|
| EasyOCR | `easyocr` | Optional | Balanced, High Quality |
| Tesseract | system `tesseract-ocr` + `pytesseract` | No | Fast |
| RapidOCR | `rapidocr-onnxruntime` | No | Available as option |
| Layout (Heron) | Included in `docling` | Optional | All standard profiles |
| TableFormer | Included in `docling` | Optional | All standard profiles |
| GraniteDocling VLM | `pip install docling[vlm]` | Yes (or API) | AI Vision |
| SmolDocling VLM | `pip install docling[vlm]` | Yes (or API) | Available as option |
| Whisper ASR | `pip install docling[asr]` | Optional | Audio (future) |
| GraniteVision | Included in `docling` | Optional | Chart extraction enrichment |
| SmolVLM | Included in `docling` | Optional | Picture description enrichment |

### Minimum install (Fast + Balanced + High Quality)

```bash
pip install docling easyocr
apt-get install tesseract-ocr  # for Fast profile
```

### Full install

```bash
pip install "docling[vlm,asr]" easyocr rapidocr-onnxruntime
apt-get install tesseract-ocr
```

---

## 5. Frontend (after everything works)

Admin config page organized by format type:
- Show all supported formats grouped by pipeline type
- Each group shows the configurable options for that pipeline
- Preset profiles as quick-select, with full options visible below
- Save custom configs as new profiles

This is last. Get the backend working first.
