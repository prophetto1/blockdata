export const CAPTURE_SERVER_START_ROUTE = '/__admin/capture-server/start';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}

export function isCaptureServerDevControlEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

export async function startCaptureServer(): Promise<{ ok: boolean; message: string }> {
  const response = await fetch(CAPTURE_SERVER_START_ROUTE, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(messageFromPayload(payload, 'Failed to start capture server.'));
  }

  if (!isRecord(payload)) {
    return { ok: true, message: 'Capture server start requested.' };
  }

  return {
    ok: payload.ok === true,
    message:
      typeof payload.message === 'string' && payload.message.trim()
        ? payload.message
        : 'Capture server start requested.',
  };
}
