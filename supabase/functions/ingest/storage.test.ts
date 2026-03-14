import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectSourceTypeForUpload, sourceTypeFromExtension } from "./storage.ts";

Deno.test("sourceTypeFromExtension keeps known source-type mappings", () => {
  assertEquals(sourceTypeFromExtension("pdf"), "pdf");
  assertEquals(sourceTypeFromExtension("docx"), "docx");
});

Deno.test("detectSourceTypeForUpload falls back to binary for unknown upload extensions", () => {
  assertEquals(detectSourceTypeForUpload("Comprehensive_AI_Funding_Landscape.json", "application/json"), "binary");
  assertEquals(detectSourceTypeForUpload("archive.custom", "application/octet-stream"), "binary");
});
