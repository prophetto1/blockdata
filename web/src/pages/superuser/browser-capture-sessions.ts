import type {
  CaptureSessionDetail,
  CaptureSessionSummary,
  CreateBrowserCaptureSessionInput,
} from './design-captures.types';

const STORAGE_KEY = 'superuser.designLayoutCapture.browserSessions.v1';

function nowIso() {
  return new Date().toISOString();
}

function makeTimestamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function makeSessionId() {
  const random = Math.random().toString(36).slice(2, 6);
  return `browser-session-${makeTimestamp()}-${random}`;
}

function sanitizeName(input: string | undefined): string {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function parseDebugPort(cdpEndpoint: string): number | null {
  try {
    const url = new URL(cdpEndpoint);
    const port = Number(url.port || '');
    return Number.isFinite(port) ? port : null;
  } catch {
    return null;
  }
}

function buildDefaultSessionName() {
  return `Capture Session ${makeTimestamp().replace('-', ' ')}`;
}

function readStoredSessions(): CaptureSessionDetail[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CaptureSessionDetail[]) : [];
  } catch {
    return [];
  }
}

function toStoredSession(session: CaptureSessionDetail): CaptureSessionDetail {
  const captures = Array.isArray(session.captures) ? session.captures : [];
  const lastCapture = captures[captures.length - 1] ?? null;
  const parsedDebugPort = parseDebugPort(session.cdpEndpoint);
  return {
    ...session,
    target: session.target ?? null,
    updatedAt: session.updatedAt || nowIso(),
    captureCount: captures.length,
    lastCapturedAt: session.lastCapturedAt || lastCapture?.capturedAt || null,
    debugPort: parsedDebugPort,
    currentTargetUrl: session.browser.currentTargetUrl,
    currentTargetTitle: session.browser.currentTargetTitle,
    browser: {
      browserPid: session.browser?.browserPid ?? null,
      chromeExecutable: session.browser?.chromeExecutable ?? null,
      cdpEndpoint: session.cdpEndpoint,
      currentTargetTitle: session.browser?.currentTargetTitle ?? null,
      currentTargetUrl: session.browser?.currentTargetUrl ?? null,
      debugPort: parsedDebugPort,
      lastError: session.browser?.lastError ?? null,
      launchedAt: session.browser?.launchedAt ?? null,
      launchUrl: session.browser?.launchUrl ?? null,
      reachable: session.browser?.reachable ?? false,
      userDataDir: session.browser?.userDataDir ?? null,
    },
    captures,
  };
}

function writeStoredSessions(sessions: CaptureSessionDetail[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.map(toStoredSession)));
}

function toSummary(session: CaptureSessionDetail): CaptureSessionSummary {
  const stored = toStoredSession(session);
  return {
    id: stored.id,
    name: stored.name,
    status: stored.status,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
    lastCapturedAt: stored.lastCapturedAt,
    storageDirectoryLabel: stored.storageDirectoryLabel,
    captureCount: stored.captureCount,
    cdpEndpoint: stored.cdpEndpoint,
    debugPort: stored.debugPort,
    currentTargetUrl: stored.currentTargetUrl,
    currentTargetTitle: stored.currentTargetTitle,
  };
}

export function listBrowserCaptureSessions(): CaptureSessionSummary[] {
  return readStoredSessions()
    .map(toStoredSession)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)))
    .map(toSummary);
}

export function readBrowserCaptureSession(sessionId: string): CaptureSessionDetail | null {
  const session = readStoredSessions().find((entry) => entry.id === sessionId);
  return session ? toStoredSession(session) : null;
}

export function saveBrowserCaptureSession(session: CaptureSessionDetail): CaptureSessionDetail {
  const stored = toStoredSession({
    ...session,
    updatedAt: nowIso(),
  });
  const sessions = readStoredSessions();
  const index = sessions.findIndex((entry) => entry.id === stored.id);
  if (index >= 0) {
    sessions[index] = stored;
  } else {
    sessions.push(stored);
  }
  writeStoredSessions(sessions);
  return stored;
}

export function createBrowserCaptureSession(input: CreateBrowserCaptureSessionInput): CaptureSessionDetail {
  const createdAt = nowIso();
  const debugPort = parseDebugPort(input.cdpEndpoint);
  const session: CaptureSessionDetail = {
    id: makeSessionId(),
    name: sanitizeName(input.name) || buildDefaultSessionName(),
    status: 'ready',
    createdAt,
    updatedAt: createdAt,
    lastCapturedAt: null,
    storageDirectoryLabel: input.storageDirectoryLabel,
    directoryHandleKey: input.directoryHandleKey,
    captureCount: 0,
    cdpEndpoint: input.cdpEndpoint,
    debugPort,
    currentTargetUrl: null,
    currentTargetTitle: null,
    target: null,
    browser: {
      cdpEndpoint: input.cdpEndpoint,
      debugPort,
      reachable: false,
      currentTargetUrl: null,
      currentTargetTitle: null,
      lastError: null,
      browserPid: input.browserPid ?? null,
      userDataDir: input.userDataDir ?? null,
      launchUrl: input.launchUrl ?? null,
      chromeExecutable: input.chromeExecutable ?? null,
      launchedAt: input.launchedAt ?? null,
    },
    captures: [],
  };

  return saveBrowserCaptureSession(session);
}
