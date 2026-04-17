import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IconChevronRight,
  IconFolderOpen,
  IconPlugConnected,
  IconPlus,
  IconRefresh,
  IconServer,
} from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { pickDirectory, saveDirectoryHandle } from '@/lib/fs-access';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createBrowserCaptureSession, listBrowserCaptureSessions } from './browser-capture-sessions';
import { isCaptureServerDevControlEnabled, startCaptureServer } from './capture-server-dev-control';
import { CAPTURE_WORKER, fetchCaptureWorkerStatus } from './capture-worker.api';
import type { CaptureSessionStatus, CaptureSessionSummary } from './design-captures.types';

const LAST_CDP_ENDPOINT_KEY = 'superuser.designLayoutCapture.lastCdpEndpoint';

function formatDate(value: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readLastCdpEndpoint(): string {
  if (typeof window === 'undefined') return 'http://localhost:9222';
  return window.localStorage.getItem(LAST_CDP_ENDPOINT_KEY) || 'http://localhost:9222';
}

function makeDirectoryHandleKey() {
  return `capture-session-directory:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function Component() {
  useShellHeaderTitle({ title: 'Capture Sessions', breadcrumbs: ['Superuser', 'Capture Sessions'] });

  const location = useLocation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<CaptureSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [startingServer, setStartingServer] = useState(false);
  const [serverActionMessage, setServerActionMessage] = useState<string | null>(null);
  const [selectedDirectoryHandle, setSelectedDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [form, setForm] = useState({
    name: '',
    cdpEndpoint: readLastCdpEndpoint(),
    directoryLabel: '',
  });

  const loadSessions = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    if (mode === 'initial') {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError(null);
      setSessions(listBrowserCaptureSessions());
      await fetchCaptureWorkerStatus();
      setWorkerReady(true);
    } catch (nextError) {
      setWorkerReady(false);
      setError(errorMessage(nextError));
      setSessions(listBrowserCaptureSessions());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions('initial');
  }, [loadSessions]);

  const canStartCaptureServer = isCaptureServerDevControlEnabled();
  const showStartServerButton = canStartCaptureServer && !workerReady;
  const workerStatusLabel = workerReady ? 'Worker ready' : error ? 'Setup needed' : 'Worker offline';
  const workerSetupGuidance = showStartServerButton
    ? 'Start Capture Server to bring the local helper online, then create your first session.'
    : 'Start the local capture helper, then refresh this page before creating a session.';
  const emptyStateCopy = workerReady
    ? 'No browser-owned sessions yet. Create one, choose a local folder, and point it at the Chrome DevTools endpoint you want to capture from.'
    : 'No browser-owned sessions yet. Bring the local capture helper online, then create a session, choose a local folder, and point it at the Chrome DevTools endpoint you want to capture from.';

  const sessionCountLabel = useMemo(() => {
    if (loading) return 'Loading sessions...';
    return `${sessions.length} session${sessions.length === 1 ? '' : 's'}`;
  }, [loading, sessions.length]);
  const recoveryNotice =
    location.state && typeof location.state === 'object' && 'captureSessionNotice' in location.state
      ? typeof location.state.captureSessionNotice === 'string'
        ? location.state.captureSessionNotice
        : null
      : null;

  async function handlePickDirectory() {
    try {
      const handle = await pickDirectory();
      setSelectedDirectoryHandle(handle);
      setForm((current) => ({
        ...current,
        directoryLabel: handle.name,
      }));
      setCreateError(null);
    } catch (nextError) {
      setCreateError(errorMessage(nextError));
    }
  }

  async function handleCreateSession() {
    if (!selectedDirectoryHandle) {
      setCreateError('Choose a local folder before starting a session.');
      return;
    }

    const cdpEndpoint = form.cdpEndpoint.trim();
    if (!cdpEndpoint) {
      setCreateError('Enter the Chrome DevTools endpoint you want this browser session to use.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);

      const directoryHandleKey = makeDirectoryHandleKey();
      const session = createBrowserCaptureSession({
        name: form.name.trim() || undefined,
        cdpEndpoint,
        storageDirectoryLabel: form.directoryLabel || selectedDirectoryHandle.name,
        directoryHandleKey,
      });

      await saveDirectoryHandle(selectedDirectoryHandle, directoryHandleKey);
      window.localStorage.setItem(LAST_CDP_ENDPOINT_KEY, cdpEndpoint);

      setShowNewSession(false);
      setSelectedDirectoryHandle(null);
      setForm({
        name: '',
        cdpEndpoint,
        directoryLabel: '',
      });

      await loadSessions();
      navigate(`/app/superuser/design-layout-captures/${session.id}`);
    } catch (nextError) {
      setCreateError(errorMessage(nextError));
    } finally {
      setCreating(false);
    }
  }

  async function handleStartCaptureServer() {
    try {
      setStartingServer(true);
      setServerActionMessage(null);
      const result = await startCaptureServer();
      setServerActionMessage(result.message);
      await loadSessions();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setStartingServer(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Capture Sessions</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Create a browser-owned capture session, choose a local folder, and save repeated screenshot plus audit JSON
            sets from the Chrome window you point this browser at.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void loadSessions()} disabled={loading || refreshing}>
            <IconRefresh />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {showStartServerButton ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleStartCaptureServer()}
              disabled={startingServer}
            >
              <IconServer />
              {startingServer ? 'Starting Capture Server...' : 'Start Capture Server'}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => {
              setCreateError(null);
              setSelectedDirectoryHandle(null);
              setForm((current) => ({
                ...current,
                name: '',
                directoryLabel: '',
                cdpEndpoint: current.cdpEndpoint || readLastCdpEndpoint(),
              }));
              setShowNewSession(true);
            }}
          >
            <IconPlus />
            New Session
          </Button>
        </div>
      </div>

      {serverActionMessage ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          {serverActionMessage}
        </div>
      ) : null}

      {recoveryNotice ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {recoveryNotice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <p>
            Capture worker not ready at <code>{CAPTURE_WORKER}</code>. {workerSetupGuidance}
          </p>
          <p className="mt-1 text-xs opacity-90">Detail: {error}</p>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session List</p>
              <p className="mt-1 text-sm text-muted-foreground">{sessionCountLabel}</p>
            </div>
            <Badge variant={workerReady ? 'green' : 'yellow'} size="sm">
              {workerStatusLabel}
            </Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <ScrollArea className="max-h-[34rem]">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Session</th>
                    <th className="w-28 px-4 py-3 font-medium">Status</th>
                    <th className="w-20 px-4 py-3 font-medium text-right">Captures</th>
                    <th className="w-48 px-4 py-3 font-medium">Last Capture</th>
                    <th className="w-52 px-4 py-3 font-medium">Endpoint</th>
                    <th className="w-32 px-4 py-3 font-medium text-right">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Loading capture sessions...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        {emptyStateCopy}
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id} className="border-t border-border align-top">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{session.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{session.id}</p>
                            <p className="truncate text-xs text-muted-foreground">{session.storageDirectoryLabel}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sessionStatusVariant(session.status)} size="sm">
                            {session.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{session.captureCount}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(session.lastCapturedAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div className="space-y-1">
                            <code className="block break-all text-xs">{session.cdpEndpoint}</code>
                            <p className="truncate text-xs">{session.currentTargetTitle || session.currentTargetUrl || '--'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/app/superuser/design-layout-captures/${session.id}`}>
                              Open
                              <IconChevronRight />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        </section>

        <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <IconFolderOpen className="size-4 text-muted-foreground" />
            Browser-owned Storage
          </div>
          <div className="rounded-lg border border-dashed border-border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">
              Each session saves into the local folder that this browser chooses through the File System Access API.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <IconPlugConnected className="size-4 text-muted-foreground" />
            Capture Worker Endpoint
          </div>
          <div className="rounded-lg border border-dashed border-border bg-background/60 p-3">
            <p className="break-all font-mono text-xs text-foreground">{CAPTURE_WORKER}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            The browser owns the session record, selected CDP endpoint, chosen save folder, and visible history. The
            helper only runs the capture worker and returns artifacts.
          </p>
        </aside>
      </div>

      <DialogRoot
        open={showNewSession}
        onOpenChange={(details) => {
          if (!creating) setShowNewSession(details.open);
        }}
      >
        <DialogContent className="w-[min(36rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]">
          <DialogCloseTrigger />
          <DialogTitle>New Capture Session</DialogTitle>
          <DialogDescription>
            This browser will store the session record and save returned artifacts into a local folder you choose.
          </DialogDescription>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="capture-session-name">
                Session name
              </label>
              <Input
                id="capture-session-name"
                value={form.name}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, name: value }));
                }}
                placeholder="Optional. A timestamped name will be generated if left blank."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="capture-session-cdp-endpoint">
                Chrome DevTools endpoint
              </label>
              <Input
                id="capture-session-cdp-endpoint"
                value={form.cdpEndpoint}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, cdpEndpoint: value }));
                }}
                placeholder="http://localhost:9222"
              />
              <p className="text-xs text-muted-foreground">
                This browser stores the endpoint it wants to use. The capture worker will attach to it only when you
                press Capture.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Session folder</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void handlePickDirectory()}>
                  <IconFolderOpen />
                  {form.directoryLabel ? 'Change Folder' : 'Choose Folder'}
                </Button>
                <p className="text-sm text-muted-foreground">{form.directoryLabel || 'No folder chosen yet.'}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                The browser saves each capture into this folder after the worker returns the generated artifacts.
              </p>
            </div>

            {createError ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {createError}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setShowNewSession(false)} disabled={creating}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleCreateSession()} disabled={creating}>
              <IconPlus />
              {creating ? 'Starting Session...' : 'Start Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </div>
  );
}
