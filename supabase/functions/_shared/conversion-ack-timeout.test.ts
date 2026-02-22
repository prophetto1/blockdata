import { assertEquals } from "jsr:@std/assert";
import {
  isConversionAckTimeoutError,
  raceWithAckTimeout,
  resolveConversionAckTimeoutMs,
} from "./conversion-ack-timeout.ts";

Deno.test("resolveConversionAckTimeoutMs uses default when unset", () => {
  assertEquals(resolveConversionAckTimeoutMs(undefined), 8000);
});

Deno.test("resolveConversionAckTimeoutMs clamps too-low values", () => {
  assertEquals(resolveConversionAckTimeoutMs("500"), 1000);
});

Deno.test("resolveConversionAckTimeoutMs clamps too-high values", () => {
  assertEquals(resolveConversionAckTimeoutMs("130000"), 30000);
});

Deno.test("resolveConversionAckTimeoutMs falls back on invalid input", () => {
  assertEquals(resolveConversionAckTimeoutMs("invalid"), 8000);
});

Deno.test("isConversionAckTimeoutError detects AbortError", () => {
  const err = new DOMException("The operation was aborted", "AbortError");
  assertEquals(isConversionAckTimeoutError(err), true);
});

Deno.test("isConversionAckTimeoutError ignores non-timeout errors", () => {
  const err = new Error("connection refused");
  assertEquals(isConversionAckTimeoutError(err), false);
});

Deno.test("raceWithAckTimeout returns response when promise resolves in time", async () => {
  const result = await raceWithAckTimeout(Promise.resolve("ok"), 50);
  assertEquals(result, { kind: "response", value: "ok" });
});

Deno.test("raceWithAckTimeout returns timeout and executes timeout hook", async () => {
  let timeoutHookCalled = false;
  const result = await raceWithAckTimeout(
    new Promise<string>(() => {}),
    20,
    () => {
      timeoutHookCalled = true;
    },
  );
  assertEquals(result, { kind: "timeout" });
  assertEquals(timeoutHookCalled, true);
});

Deno.test("raceWithAckTimeout returns error when promise rejects before timeout", async () => {
  const result = await raceWithAckTimeout(
    Promise.reject(new Error("boom")),
    1000,
  );
  if (result.kind !== "error") {
    throw new Error(`Expected error result, got: ${result.kind}`);
  }
  assertEquals((result.error as Error).message, "boom");
});
