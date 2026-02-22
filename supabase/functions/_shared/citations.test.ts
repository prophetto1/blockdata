import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCitationText, toCitationArtifactLocator } from "./citations.ts";

Deno.test("toCitationArtifactLocator rewrites markdown locator suffix", () => {
  assertEquals(
    toCitationArtifactLocator("converted/abc123/sample.md"),
    "converted/abc123/sample.citations.json",
  );
});

Deno.test("toCitationArtifactLocator rewrites docling locator suffix", () => {
  assertEquals(
    toCitationArtifactLocator("converted/abc123/sample.docling.json"),
    "converted/abc123/sample.citations.json",
  );
});

Deno.test("toCitationArtifactLocator falls back to final extension replacement", () => {
  assertEquals(
    toCitationArtifactLocator("uploads/abc123/sample.pdf"),
    "uploads/abc123/sample.citations.json",
  );
});

Deno.test("buildCitationText joins block content with newline separators", () => {
  assertEquals(
    buildCitationText([
      { block_content: "First paragraph." },
      { block_content: "Second paragraph with 531 U.S. 98." },
    ]),
    "First paragraph.\nSecond paragraph with 531 U.S. 98.",
  );
});
