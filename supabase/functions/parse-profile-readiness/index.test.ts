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

Deno.test("Balanced profile: ready (OCR only, picture_classification is not model-backed)", () => {
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
  assertEquals(result.profile_name, "Balanced");
  assertEquals(result.requirements.ocr_backend, "easyocr");
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
  // Also picks up enrichment from top-level enrichments
  assertEquals(result.requirements.enrichment_models.includes("picture_description"), true);
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
  assertEquals(result.profile_name, "High Quality");
  assertEquals(result.requirements.ocr_backend, "easyocr");
  assertEquals(result.requirements.enrichment_models.length > 0, true);
  assertEquals(result.requirements.enrichment_models.includes("picture_description"), true);
  assertEquals(result.requirements.enrichment_models.includes("chart_extraction"), true);
  // do_picture_classification is NOT in enrichment_models (not model-backed)
  assertEquals(result.requirements.enrichment_models.includes("picture_classification"), false);
});