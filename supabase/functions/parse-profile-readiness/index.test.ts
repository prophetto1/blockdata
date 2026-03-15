import { assertEquals } from "jsr:@std/assert";
import { classifyProfileReadiness } from "./readiness_check.ts";

Deno.test("Fast profile: ready (OCR only, no VLM, no enrichment)", () => {
  const result = classifyProfileReadiness({
    profileId: "fast-uuid",
    parser: "docling",
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
  assertEquals(result.profile_id, "fast-uuid");
  assertEquals(result.profile_name, "Fast");
  assertEquals(result.parser, "docling");
  assertEquals(result.requirements.vlm_model, null);
  assertEquals(result.requirements.enrichment_models, []);
});

Deno.test("Balanced profile: ready (OCR only, picture_classification is not model-backed)", () => {
  const result = classifyProfileReadiness({
    profileId: "balanced-uuid",
    parser: "docling",
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
  const result = classifyProfileReadiness({
    profileId: "aivision-uuid",
    parser: "docling",
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
  assertEquals(result.profile_id, "aivision-uuid");
  assertEquals(result.reasons.length > 0, true);
  assertEquals(result.requirements.vlm_model, "granite_docling");
  assertEquals(result.requirements.enrichment_models.includes("picture_description"), true);
});

Deno.test("High Quality profile: not ready (requires enrichment models)", () => {
  const result = classifyProfileReadiness({
    profileId: "hq-uuid",
    parser: "docling",
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
  assertEquals(result.requirements.enrichment_models.includes("picture_classification"), false);
});
