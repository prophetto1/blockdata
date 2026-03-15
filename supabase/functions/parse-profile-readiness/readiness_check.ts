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

/**
 * Classify a parsing profile's readiness by inspecting its config JSON.
 *
 * This is config-based inference, NOT a live probe of the conversion service.
 * Profiles that only need OCR are marked ready. Profiles that require a VLM
 * or enrichment models are marked not ready because the platform cannot verify
 * those backends are configured without conversion service runtime reporting.
 *
 * Config shape reference: 20260310120000_075_parsing_pipeline_config.sql
 * - OCR backend: config.pdf_pipeline.ocr_options.kind
 * - VLM preset: config.vlm_pipeline.vlm_options.preset
 * - Enrichments: config.enrichments (top-level key, NOT under pdf_pipeline)
 * - do_picture_classification is NOT model-backed (Docling-internal heuristic)
 * - do_picture_description and do_chart_extraction require external AI models
 */
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
