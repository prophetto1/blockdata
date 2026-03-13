import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runtimePolicyDefaults } from "../_shared/admin_policy.ts";
import { resolveIngestRoute } from "./routing.ts";

Deno.test("resolveIngestRoute resolves markdown to docling track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("sample.md", policy);
  assertEquals(resolved.extension, "md");
  assertEquals(resolved.source_type, "md");
  assertEquals(resolved.track, "docling");
});

Deno.test("resolveIngestRoute resolves rst to docling track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("spec.rst", policy);
  assertEquals(resolved.extension, "rst");
  assertEquals(resolved.source_type, "rst");
  assertEquals(resolved.track, "docling");
});

Deno.test("resolveIngestRoute resolves odt to docling track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("doc.odt", policy);
  assertEquals(resolved.extension, "odt");
  assertEquals(resolved.source_type, "odt");
  assertEquals(resolved.track, "docling");
});

Deno.test("resolveIngestRoute resolves epub to docling track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("book.epub", policy);
  assertEquals(resolved.extension, "epub");
  assertEquals(resolved.source_type, "epub");
  assertEquals(resolved.track, "docling");
});

Deno.test("resolveIngestRoute resolves rtf to docling track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("memo.rtf", policy);
  assertEquals(resolved.extension, "rtf");
  assertEquals(resolved.source_type, "rtf");
  assertEquals(resolved.track, "docling");
});

Deno.test("resolveIngestRoute resolves org to docling track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("notes.org", policy);
  assertEquals(resolved.extension, "org");
  assertEquals(resolved.source_type, "org");
  assertEquals(resolved.track, "docling");
});

Deno.test("resolveIngestRoute rejects unsupported extension", () => {
  const policy = runtimePolicyDefaults();
  assertThrows(
    () => resolveIngestRoute("photo.jpg", policy),
    Error,
    "Extension not enabled by runtime policy",
  );
});