import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyPolicyValue,
  buildRuntimePolicySnapshot,
  runtimePolicyDefaults,
} from "./admin_policy.ts";

Deno.test("applyPolicyValue accepts track_b.api_enabled and track_b.worker_enabled", () => {
  const policy = runtimePolicyDefaults();
  const okApi = applyPolicyValue(policy, "track_b.api_enabled", false);
  const okWorker = applyPolicyValue(policy, "track_b.worker_enabled", false);

  assertEquals(okApi, true);
  assertEquals(okWorker, true);
  assertEquals(policy.track_b.api_enabled, false);
  assertEquals(policy.track_b.worker_enabled, false);
});

Deno.test("buildRuntimePolicySnapshot includes track_b rollout flags", () => {
  const policy = runtimePolicyDefaults();
  policy.track_b.api_enabled = false;
  policy.track_b.worker_enabled = false;

  const snapshot = buildRuntimePolicySnapshot(
    policy,
    "2026-02-15T00:00:00.000Z",
  );

  assertEquals(snapshot.track_b.api_enabled, false);
  assertEquals(snapshot.track_b.worker_enabled, false);
});
