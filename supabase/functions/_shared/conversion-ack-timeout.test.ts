import { assertEquals } from "jsr:@std/assert";
import {
  isConversionAckTimeoutError,
  resolveConversionAckTimeoutMs,
} from "./conversion-ack-timeout.ts";

Deno.test("resolveConversionAckTimeoutMs uses default when unset", () => {
  assertEquals(resolveConversionAckTimeoutMs(undefined), 8000);
});

Deno.test("resolveConversionAckTimeoutMs clamps too-low values", () => {
  assertEquals(resolveConversionAckTimeoutMs("500"), 1000);
});

Deno.test("resolveConversionAckTimeoutMs clamps too-high values", () => {
  assertEquals(resolveConversionAckTimeoutMs("130000"), 120000);
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
