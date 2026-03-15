import { assertEquals } from "jsr:@std/assert";
import { buildRequestedPipelineConfig, resolveAppliedConfig } from "./parse_pipeline_contract.ts";

Deno.test("profile config is decorated with profile metadata", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-1",
    profileConfig: { name: "Balanced", pipeline: "standard" },
    configOverride: null,
  });

  assertEquals(result, {
    name: "Balanced",
    pipeline: "standard",
    _profile_id: "profile-1",
    _profile_name: "Balanced",
  });
});

Deno.test("explicit config override wins over saved profile", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-1",
    profileConfig: { name: "Balanced" },
    configOverride: { pipeline: "vlm" },
  });

  assertEquals(result, { pipeline: "vlm" });
});

Deno.test("null profile returns empty object", () => {
  const result = buildRequestedPipelineConfig({
    profileId: null,
    profileConfig: null,
    configOverride: null,
  });

  assertEquals(result, {});
});

Deno.test("profile without name sets _profile_name to null", () => {
  const result = buildRequestedPipelineConfig({
    profileId: "profile-2",
    profileConfig: { pipeline: "standard" },
    configOverride: null,
  });

  assertEquals(result, {
    pipeline: "standard",
    _profile_id: "profile-2",
    _profile_name: null,
  });
});

Deno.test("modern callback: applied config and runtime meta are used directly", () => {
  const result = resolveAppliedConfig({
    pipelineConfig: { name: "Balanced" },
    appliedPipelineConfig: { pipeline: "standard", ocr: "easyocr" },
    parserRuntimeMeta: { parser: "docling", parser_version: "0.19.0" },
  });

  assertEquals(result.requestedPipelineConfig, { name: "Balanced" });
  assertEquals(result.appliedPipelineConfig, { pipeline: "standard", ocr: "easyocr" });
  assertEquals(result.parserRuntimeMeta, { parser: "docling", parser_version: "0.19.0" });
});

Deno.test("legacy callback: falls back pipeline_config into both requested and applied", () => {
  const result = resolveAppliedConfig({
    pipelineConfig: { name: "Fast" },
    appliedPipelineConfig: undefined,
    parserRuntimeMeta: undefined,
  });

  assertEquals(result.requestedPipelineConfig, { name: "Fast" });
  assertEquals(result.appliedPipelineConfig, { name: "Fast" });
  assertEquals(result.parserRuntimeMeta, {});
});

Deno.test("null pipeline_config: all fields default to empty objects", () => {
  const result = resolveAppliedConfig({
    pipelineConfig: null,
    appliedPipelineConfig: null,
    parserRuntimeMeta: null,
  });

  assertEquals(result.requestedPipelineConfig, {});
  assertEquals(result.appliedPipelineConfig, {});
  assertEquals(result.parserRuntimeMeta, {});
});
