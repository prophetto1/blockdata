import type {
  CaptureArtifact,
  CaptureSessionDefaults,
  CaptureSessionDetail,
  CaptureSessionSummary,
  CreateCaptureSessionRequest,
} from './design-captures.types';

export const CAPTURE_SERVER = import.meta.env.VITE_CAPTURE_SERVER_URL || 'http://localhost:4488';

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchCaptureSessionDefaults(): Promise<CaptureSessionDefaults> {
  const response = await fetch(`${CAPTURE_SERVER}/capture-sessions/defaults`);
  return readJsonOrThrow<CaptureSessionDefaults>(response);
}

export async function fetchCaptureSessions(): Promise<CaptureSessionSummary[]> {
  const response = await fetch(`${CAPTURE_SERVER}/capture-sessions`);
  const payload = await readJsonOrThrow<{ sessions: CaptureSessionSummary[] }>(response);
  return payload.sessions;
}

export async function createCaptureSession(
  request: CreateCaptureSessionRequest,
): Promise<CaptureSessionSummary> {
  const response = await fetch(`${CAPTURE_SERVER}/capture-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await readJsonOrThrow<{ session: CaptureSessionSummary }>(response);
  return payload.session;
}

export async function fetchCaptureSessionDetail(sessionId: string): Promise<CaptureSessionDetail> {
  const response = await fetch(`${CAPTURE_SERVER}/capture-sessions/${encodeURIComponent(sessionId)}`);
  const payload = await readJsonOrThrow<{ session: CaptureSessionDetail }>(response);
  return payload.session;
}

export async function triggerCaptureSession(sessionId: string): Promise<CaptureArtifact> {
  const response = await fetch(
    `${CAPTURE_SERVER}/capture-sessions/${encodeURIComponent(sessionId)}/captures`,
    { method: 'POST' },
  );
  const payload = await readJsonOrThrow<{ capture: CaptureArtifact }>(response);
  return payload.capture;
}
