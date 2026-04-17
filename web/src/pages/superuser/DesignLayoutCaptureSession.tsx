import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft,
  IconCamera,
  IconExternalLink,
  IconFileText,
  IconRefresh,
  IconScreenshot,
} from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getCaptureSessionDirectoryHandle,
  openSavedCaptureArtifact,
  saveCaptureArtifacts,
  saveSessionManifest,
} from './capture-session-files';
import { readBrowserCaptureSession, saveBrowserCaptureSession } from './browser-capture-sessions';
import { probeCaptureBrowser, runCaptureWorker } from './capture-worker.api';
import type {
  CaptureArtifact,
  CaptureArtifactStatus,
  CaptureSessionDetail,
  CaptureSessionStatus,
} from './design-captures.types';

function formatDate(value: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sessionStatusVariant(status: CaptureSessionStatus) {
  switch (status) {
    case 'ready':
      return 'green';
    case 'capturing':
      return 'blue';
    case 'browser-unreachable':
      return 'yellow';
    case 'capture-failed':
      return 'red';
    case 'directory-missing':
      return 'yellow';
    default:
      return 'gray';
  }
}

function captureStatusVariant(status: CaptureArtifactStatus) {
  switch (status) {
    case 'complete':
      return 'green';
    case 'capturing':
      return 'blue';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}

function viewportLabel(capture: CaptureArtifact): string {
  if (!capture.viewportWidth || !capture.viewportHeight) return '--';
  return `${capture.viewportWidth}x${capture.viewportHeight}`;
}

function buildCaptureSuccessMessage(capture: CaptureArtifact): string {
  return `Captured ${capture.pageTitle || capture.pageUrl || 'current page'} at ${formatDate(capture.capturedAt)}.`;
}

export function Component() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  useShellHeaderTitle({ title: 'Capture Session', breadcrumbs: ['Superuser', 'Capture Sessions', 'Session'] });

  const [session, setSession] = useState<CaptureSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureFeedback, setCaptureFeedback] = useState<string | null>(null);

  const redirectToSessionList = (missingSessionId: string) => {
    navigate('/app/superuser/design-layout-captures', {
      replace: true,
      state: {
        captureSessionNotice: `Session ${missingSessionId} not found. Returned to Capture Sessions.`,
      },
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function loadSession(mode: 'initial' | 'refresh') {
      if (!sessionId) {
        if (!cancelled) {
          setError('Missing capture session id.');
          setLoading(false);
          setRefreshing(false);
        }
        return;
      }

      if (!cancelled) {
        if (mode === 'initial') {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
      }

      const stored = readBrowserCaptureSession(sessionId);
      if (!stored) {
        if (!cancelled) {
          redirectToSessionList(sessionId);
        }
        return;
      }

      if (!cancelled) {
        setSession(stored);
        setError(null);
      }

      try {
        const probe = await probeCaptureBrowser(stored.cdpEndpoint);
        const nextSession: CaptureSessionDetail = {
          ...stored,
          status: probe.reachable ? 'ready' : 'browser-unreachable',
          currentTargetUrl: probe.currentTargetUrl,
          currentTargetTitle: probe.currentTargetTitle,
          browser: {
            ...stored.browser,
            reachable: probe.reachable,
            currentTargetUrl: probe.currentTargetUrl,
            currentTargetTitle: probe.currentTargetTitle,
            lastError: null,
          },
        };
        saveBrowserCaptureSession(nextSession);

        if (!cancelled) {
          setSession(nextSession);
        }
      } catch (nextError) {
        const nextSession: CaptureSessionDetail = {
          ...stored,
          status: 'browser-unreachable',
          browser: {
            ...stored.browser,
            reachable: false,
            lastError: errorMessage(nextError),
          },
        };
        saveBrowserCaptureSession(nextSession);

        if (!cancelled) {
          setSession(nextSession);
          setError(errorMessage(nextError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadSession('initial');

    return () => {
      cancelled = true;
    };
  }, [navigate, sessionId]);

  async function refreshSession() {
    if (!sessionId) return;

    setRefreshing(true);
    setError(null);

    const stored = readBrowserCaptureSession(sessionId);
    if (!stored) {
      redirectToSessionList(sessionId);
      return;
    }

    setSession(stored);

    try {
      const probe = await probeCaptureBrowser(stored.cdpEndpoint);
      const nextSession: CaptureSessionDetail = {
        ...stored,
        status: probe.reachable ? 'ready' : 'browser-unreachable',
        currentTargetUrl: probe.currentTargetUrl,
        currentTargetTitle: probe.currentTargetTitle,
        browser: {
          ...stored.browser,
          reachable: probe.reachable,
          currentTargetUrl: probe.currentTargetUrl,
          currentTargetTitle: probe.currentTargetTitle,
          lastError: null,
        },
      };
      saveBrowserCaptureSession(nextSession);
      setSession(nextSession);
    } catch (nextError) {
      const nextSession: CaptureSessionDetail = {
        ...stored,
        status: 'browser-unreachable',
        browser: {
          ...stored.browser,
          reachable: false,
          lastError: errorMessage(nextError),
        },
      };
      saveBrowserCaptureSession(nextSession);
      setSession(nextSession);
      setError(errorMessage(nextError));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCapture() {
    if (!session) return;

    try {
      setCaptureBusy(true);
      setCaptureFeedback(null);
      setError(null);

      const rootHandle = await getCaptureSessionDirectoryHandle(session.directoryHandleKey);
      const workerResult = await runCaptureWorker(session.cdpEndpoint);
      const savedPaths = await saveCaptureArtifacts(rootHandle, workerResult);

      const capture: CaptureArtifact = {
        id: workerResult.captureId,
        status: 'complete',
        capturedAt: workerResult.capturedAt,
        pageUrl: workerResult.pageUrl,
        pageTitle: workerResult.pageTitle,
        viewportWidth: workerResult.viewportWidth,
        viewportHeight: workerResult.viewportHeight,
        reportRelativePath: savedPaths.reportRelativePath,
        viewportRelativePath: savedPaths.viewportRelativePath,
        fullPageRelativePath: savedPaths.fullPageRelativePath,
      };

      const nextSession: CaptureSessionDetail = {
        ...session,
        status: 'ready',
        captureCount: session.captures.length + 1,
        lastCapturedAt: capture.capturedAt,
        currentTargetUrl: workerResult.currentTargetUrl ?? workerResult.pageUrl,
        currentTargetTitle: workerResult.currentTargetTitle ?? workerResult.pageTitle,
        browser: {
          ...session.browser,
          reachable: true,
          currentTargetUrl: workerResult.currentTargetUrl ?? workerResult.pageUrl,
          currentTargetTitle: workerResult.currentTargetTitle ?? workerResult.pageTitle,
          lastError: null,
        },
        captures: [...session.captures, capture],
      };
      saveBrowserCaptureSession(nextSession);

      await saveSessionManifest(rootHandle, nextSession);
      setSession(nextSession);
      setCaptureFeedback(buildCaptureSuccessMessage(capture));
    } catch (nextError) {
      const message = errorMessage(nextError);
      const nextStatus: CaptureSessionStatus = message.includes('folder') ? 'directory-missing' : 'capture-failed';
      const nextSession: CaptureSessionDetail | null = session
        ? {
            ...session,
            status: nextStatus,
            browser: {
              ...session.browser,
              lastError: message,
            },
          }
        : null;

      if (nextSession) {
        saveBrowserCaptureSession(nextSession);
        setSession(nextSession);
      }
      setError(message);
    } finally {
      setCaptureBusy(false);
    }
  }

  async function handleOpenArtifact(relativePath: string | null) {
    if (!session || !relativePath) return;

    try {
      const rootHandle = await getCaptureSessionDirectoryHandle(session.directoryHandleKey);
      await openSavedCaptureArtifact(rootHandle, relativePath);
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  const helperCopy = !session
    ? 'Launch a session first.'
    : !session.browser.reachable
      ? 'This browser session cannot reach the chosen Chrome endpoint right now. Reconnect Chrome or update the endpoint.'
      : 'Navigate in the real Chrome window you want to inspect, then come back here and press Capture.';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild size="sm" variant="ghost" className="-ml-3 w-fit">
            <Link to="/app/superuser/design-layout-captures">
              <IconArrowLeft />
              Back to sessions
            </Link>
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{session?.name || 'Capture Session'}</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">{helperCopy}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void refreshSession()} disabled={loading || refreshing || captureBusy}>
            <IconRefresh />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={() => void handleCapture()} disabled={!session || captureBusy || !session.browser.reachable}>
            <IconCamera />
            {captureBusy ? 'Capturing...' : 'Capture'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {captureFeedback ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground">{captureFeedback}</div>
      ) : null}

      {loading && !session ? (
        <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Loading capture session...
        </div>
      ) : null}

      {session ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session</p>
                  <p className="mt-1 text-lg font-medium text-foreground">{session.name}</p>
                </div>
                <Badge variant={sessionStatusVariant(session.status)} size="sm">
                  {session.status}
                </Badge>
              </div>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Session Id</dt>
                  <dd className="break-all font-mono text-xs text-foreground">{session.id}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Created</dt>
                  <dd className="text-sm text-foreground">{formatDate(session.createdAt)}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Local Folder</dt>
                  <dd className="break-all font-mono text-xs text-foreground">{session.storageDirectoryLabel}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Directory Handle</dt>
                  <dd className="break-all font-mono text-xs text-foreground">{session.directoryHandleKey}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Capture Count</dt>
                  <dd className="text-sm text-foreground">{session.captureCount}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last Capture</dt>
                  <dd className="text-sm text-foreground">{formatDate(session.lastCapturedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Browser</p>
                  <p className="mt-1 text-lg font-medium text-foreground">Live Browser Connection</p>
                </div>
                <Badge variant={session.browser.reachable ? 'green' : 'yellow'} size="sm">
                  {session.browser.reachable ? 'reachable' : 'unreachable'}
                </Badge>
              </div>
              <dl className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Debug Port</dt>
                  <dd className="font-mono text-xs text-foreground">{session.browser.debugPort ?? '--'}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Endpoint</dt>
                  <dd className="break-all font-mono text-xs text-foreground">{session.browser.cdpEndpoint}</dd>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <dt className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current Page</dt>
                  <dd className="text-sm text-foreground">{session.browser.currentTargetTitle || '--'}</dd>
                  <dd className="break-all font-mono text-xs text-muted-foreground">
                    {session.browser.currentTargetUrl || '--'}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Captures</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The helper returns artifacts to this browser, and the browser saves them into the folder this session owns.
                </p>
              </div>
              <Badge variant="outline" size="sm">
                {session.captures.length} stored
              </Badge>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
              <ScrollArea className="h-full max-h-[32rem]">
                <table className="w-full table-fixed text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <tr>
                      <th className="w-44 px-4 py-3 font-medium">Captured</th>
                      <th className="px-4 py-3 font-medium">Page</th>
                      <th className="w-28 px-4 py-3 font-medium">Viewport</th>
                      <th className="w-28 px-4 py-3 font-medium">Status</th>
                      <th className="w-72 px-4 py-3 font-medium text-right">Artifacts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.captures.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No captures yet. Navigate in Chrome, then press Capture.
                        </td>
                      </tr>
                    ) : (
                      [...session.captures].reverse().map((capture) => (
                        <tr key={capture.id} className="border-t border-border align-top">
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(capture.capturedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{capture.pageTitle || 'Untitled page'}</p>
                              <p className="break-all text-xs text-muted-foreground">{capture.pageUrl || '--'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{viewportLabel(capture)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={captureStatusVariant(capture.status)} size="sm">
                              {capture.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              {capture.viewportRelativePath ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleOpenArtifact(capture.viewportRelativePath)}
                                >
                                  <IconScreenshot />
                                  Viewport
                                </Button>
                              ) : null}
                              {capture.fullPageRelativePath ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleOpenArtifact(capture.fullPageRelativePath)}
                                >
                                  <IconExternalLink />
                                  Full Page
                                </Button>
                              ) : null}
                              {capture.reportRelativePath ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void handleOpenArtifact(capture.reportRelativePath)}
                                >
                                  <IconFileText />
                                  Report
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
