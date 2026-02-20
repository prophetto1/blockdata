import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseIngestMode } from "./mode.ts";

Deno.test("parseIngestMode defaults to ingest when mode missing", () => {
  assertEquals(parseIngestMode(null), "ingest");
});

Deno.test("parseIngestMode accepts upload_only", () => {
  assertEquals(parseIngestMode("upload_only"), "upload_only");
});

Deno.test("parseIngestMode falls back to ingest for unknown values", () => {
  assertEquals(parseIngestMode("something_else"), "ingest");
});
