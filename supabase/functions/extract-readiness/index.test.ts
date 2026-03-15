import { assertEquals } from "jsr:@std/assert";
import { checkExtractReadiness } from "./readiness_check.ts";

Deno.test("not ready when GCP_VERTEX_SA_KEY is missing", () => {
  const result = checkExtractReadiness({
    gcpVertexSaKey: undefined,
  });

  assertEquals(result.is_ready, false);
  assertEquals(result.reasons.length > 0, true);
  assertEquals(result.reasons[0], "Missing GCP_VERTEX_SA_KEY");
});

Deno.test("ready when GCP_VERTEX_SA_KEY is present", () => {
  const result = checkExtractReadiness({
    gcpVertexSaKey: "some-key",
  });

  assertEquals(result.is_ready, true);
  assertEquals(result.reasons.length, 0);
});
