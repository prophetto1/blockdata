import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runtimePolicyDefaults } from "../_shared/admin_policy.ts";
import { resolveIngestRoute } from "./routing.ts";

Deno.test("resolveIngestRoute resolves markdown to mdast track", () => {
  const policy = runtimePolicyDefaults();
  const resolved = resolveIngestRoute("sample.md", policy);
  assertEquals(resolved.extension, "md");
  assertEquals(resolved.source_type, "md");
  assertEquals(resolved.track, "mdast");
});

Deno.test("resolveIngestRoute resolves rst to pandoc when enabled and allowed", () => {
  const policy = runtimePolicyDefaults();
  policy.upload.track_enabled.pandoc = true;
  policy.upload.allowed_extensions.push("rst");
  const resolved = resolveIngestRoute("spec.rst", policy);
  assertEquals(resolved.extension, "rst");
  assertEquals(resolved.source_type, "rst");
  assertEquals(resolved.track, "pandoc");
});

Deno.test("resolveIngestRoute rejects disabled extension", () => {
  const policy = runtimePolicyDefaults();
  assertThrows(
    () => resolveIngestRoute("paper.rst", policy),
    Error,
    "Extension not enabled by runtime policy",
  );
});

Deno.test("resolveIngestRoute rejects when routed track is disabled", () => {
  const policy = runtimePolicyDefaults();
  policy.upload.allowed_extensions.push("rst");
  policy.upload.track_enabled.pandoc = false;
  assertThrows(
    () => resolveIngestRoute("paper.rst", policy),
    Error,
    "Track disabled by runtime policy",
  );
});
