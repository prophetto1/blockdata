import type {
  CaptureBrowserProbe,
  CaptureBrowserTarget,
  CaptureSessionBrowser,
  CaptureWorkerResult,
  CaptureWorkerStatus,
  LaunchCaptureBrowserRequest,
  RecoverCaptureBrowserRequest,
} from './design-captures.types';

export const CAPTURE_WORKER = import.meta.env.VITE_CAPTURE_SERVER_URL || 'http://localhost:4488';

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

export async function fetchCaptureWorkerStatus(): Promise<CaptureWorkerStatus> {
  const response = await fetch(`${CAPTURE_WORKER}/capture-worker/status`);
  if (response.status === 404) {
    throw new Error('The capture helper running on port 4488 is outdated. Press Start Capture Server to restart it.');
  }
  return readJsonOrThrow<CaptureWorkerStatus>(response);
}

export async function probeCaptureBrowser(cdpEndpoint: string): Promise<CaptureBrowserProbe> {
  const response = await fetch(`${CAPTURE_WORKER}/capture-worker/probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cdpEndpoint }),
  });
  const payload = await readJsonOrThrow<{ probe: CaptureBrowserProbe }>(response);
  return payload.probe;
}

export async function listCaptureBrowserTargets(cdpEndpoint: string): Promise<CaptureBrowserTarget[]> {
  const response = await fetch(`${CAPTURE_WORKER}/capture-worker/targets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cdpEndpoint }),
  });
  const payload = await readJsonOrThrow<{ targets: CaptureBrowserTarget[] }>(response);
  return payload.targets;
}

export async function runCaptureWorker(cdpEndpoint: string, targetId: string): Promise<CaptureWorkerResult> {
  const response = await fetch(`${CAPTURE_WORKER}/capture-worker/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cdpEndpoint, targetId }),
  });
  const payload = await readJsonOrThrow<{ capture: CaptureWorkerResult }>(response);
  return payload.capture;
}

export async function launchCaptureBrowser(
  request: LaunchCaptureBrowserRequest = {},
): Promise<CaptureSessionBrowser> {
  const response = await fetch(`${CAPTURE_WORKER}/capture-browser/launch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await readJsonOrThrow<{ browser: CaptureSessionBrowser }>(response);
  return payload.browser;
}

export async function recoverCaptureBrowser(
  request: RecoverCaptureBrowserRequest,
): Promise<CaptureSessionBrowser> {
  const response = await fetch(`${CAPTURE_WORKER}/capture-browser/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = await readJsonOrThrow<{ browser: CaptureSessionBrowser }>(response);
  return payload.browser;
}
