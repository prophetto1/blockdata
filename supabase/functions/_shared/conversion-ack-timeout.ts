const DEFAULT_ACK_TIMEOUT_MS = 8000;
const MIN_ACK_TIMEOUT_MS = 1000;
// Keep timeout safely below hosted Edge request idle timeout on free plans.
const MAX_ACK_TIMEOUT_MS = 30000;

export type AckTimeoutRaceResult<T> =
  | { kind: "response"; value: T }
  | { kind: "error"; error: unknown }
  | { kind: "timeout" };

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

export async function raceWithAckTimeout<T>(
  task: Promise<T>,
  ackTimeoutMs: number,
  onTimeout?: () => void,
): Promise<AckTimeoutRaceResult<T>> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<AckTimeoutRaceResult<T>>((resolve) => {
    timeoutHandle = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // Best-effort timeout hook; do not fail the race on hook errors.
      }
      resolve({ kind: "timeout" });
    }, ackTimeoutMs);
  });

  // Wrap task outcome so the race never leaks unhandled rejections.
  const taskPromise = task
    .then((value) => ({ kind: "response", value }) as const)
    .catch((error) => ({ kind: "error", error }) as const);

  const result = await Promise.race([taskPromise, timeoutPromise]);
  if (timeoutHandle !== undefined) {
    clearTimeout(timeoutHandle);
  }
  return result;
}
