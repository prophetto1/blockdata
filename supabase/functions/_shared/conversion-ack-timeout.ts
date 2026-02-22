const DEFAULT_ACK_TIMEOUT_MS = 8000;
const MIN_ACK_TIMEOUT_MS = 1000;
const MAX_ACK_TIMEOUT_MS = 120000;

export function resolveConversionAckTimeoutMs(
  raw: string | null | undefined,
): number {
  const parsed = Number(raw ?? DEFAULT_ACK_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_ACK_TIMEOUT_MS;
  const clamped = Math.min(Math.max(Math.trunc(parsed), MIN_ACK_TIMEOUT_MS), MAX_ACK_TIMEOUT_MS);
  return clamped;
}

export function isConversionAckTimeoutError(err: unknown): boolean {
  if (err instanceof DOMException) {
    return err.name === "AbortError";
  }
  if (err instanceof Error) {
    return /abort(ed|ing)?/i.test(err.message);
  }
  return false;
}
