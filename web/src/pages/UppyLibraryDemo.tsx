import { useCallback, useEffect, useMemo, useState } from 'react';
import { Switch } from '@ark-ui/react/switch';
import {
  SegmentGroupRoot,
  SegmentGroupIndicator,
  SegmentGroupItem,
  SegmentGroupItemText,
  SegmentGroupItemHiddenInput,
} from '@/components/ui/segment-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import Uppy, { type UploadResult } from '@uppy/core';
import Dashboard from '@uppy/react/dashboard';
import Tus from '@uppy/tus';
import UppyRemoteSources from '@uppy/remote-sources';
import XHRUpload from '@uppy/xhr-upload';
import { useAuth } from '@/auth/AuthContext';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';

type UploadMode = 'xhr_ingest' | 'tus';
type LogLevel = 'info' | 'error';
type UppyMeta = { project_id: string };
type UppyBody = Record<string, never>;
type UppyInstance = Uppy<UppyMeta, UppyBody>;
const REMOTE_SOURCE_PLUGINS = ['GoogleDrive'] as const;

type LogEntry = {
  at: string;
  level: LogLevel;
  message: string;
};

type IngestResponse = {
  source_uid?: string;
  conv_uid?: string | null;
  status?: string;
  blocks_count?: number;
  error?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const DEFAULT_COMPANION_URL = (import.meta.env.VITE_UPPY_COMPANION_URL as string | undefined) ?? '';
const DEFAULT_TUS_ENDPOINT = (import.meta.env.VITE_UPPY_TUS_ENDPOINT as string | undefined) ?? '';
const DEFAULT_FINALIZE_ENDPOINT = (import.meta.env.VITE_UPPY_FINALIZE_ENDPOINT as string | undefined) ?? '';

function nowLabel(): string {
  return new Date().toLocaleTimeString();
}

function getIngestEndpoint(): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/ingest`;
}

export default function UppyLibraryDemo() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [uploadMode, setUploadMode] = useState<UploadMode>('xhr_ingest');
  const [useCompanion, setUseCompanion] = useState(false);
  const [companionUrl, setCompanionUrl] = useState(DEFAULT_COMPANION_URL);
  const [tusEndpoint, setTusEndpoint] = useState(DEFAULT_TUS_ENDPOINT);
  const [enableFinalize, setEnableFinalize] = useState(Boolean(DEFAULT_FINALIZE_ENDPOINT));
  const [finalizeEndpoint, setFinalizeEndpoint] = useState(DEFAULT_FINALIZE_ENDPOINT);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [uppy, setUppy] = useState<UppyInstance | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastCompleteSummary, setLastCompleteSummary] = useState<string | null>(null);

  const ingestEndpoint = useMemo(() => getIngestEndpoint(), []);

  const appendLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => [{ at: nowLabel(), level, message }, ...prev].slice(0, 80));
  }, []);

  const clearLogs = () => setLogs([]);

  useEffect(() => {
    if (!projectId) {
      setSetupError('Missing project id in route.');
      setUppy(null);
      return;
    }
    if (!session?.access_token) {
      setSetupError('No active auth session found.');
      setUppy(null);
      return;
    }

    const instance = new Uppy<UppyMeta, UppyBody>({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 10,
      },
      meta: {
        project_id: projectId,
      },
    });

    try {
      if (uploadMode === 'xhr_ingest') {
        if (!ingestEndpoint || !SUPABASE_ANON_KEY) {
          throw new Error('XHR ingest mode requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        }
        instance.use(XHRUpload, {
          endpoint: ingestEndpoint,
          method: 'post',
          fieldName: 'file',
          formData: true,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_ANON_KEY,
          },
          allowedMetaFields: ['project_id'],
        });
        appendLog('info', `Uploader initialized in XHR mode -> ${ingestEndpoint}`);
      } else {
        const endpoint = tusEndpoint.trim();
        if (!endpoint) {
          throw new Error('Tus mode selected but endpoint is empty.');
        }
        instance.use(Tus, {
          endpoint,
          retryDelays: [0, 1000, 3000, 5000],
        });
        appendLog('info', `Uploader initialized in Tus mode -> ${endpoint}`);
      }

      if (useCompanion) {
        const endpoint = companionUrl.trim();
        if (!endpoint) {
          throw new Error('Companion toggle is enabled, but Companion URL is empty.');
        }
        instance.use(UppyRemoteSources, {
          companionUrl: endpoint,
          sources: [...REMOTE_SOURCE_PLUGINS],
          companionHeaders: {
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          companionCookiesRule: 'include',
        });
        appendLog('info', `Companion remote sources enabled -> ${endpoint}`);
      }

      instance.on('file-added', (file) => {
        appendLog('info', `Queued: ${file.name}`);
      });

      instance.on('upload-error', (file, error) => {
        const fileName = file?.name ?? '(unknown file)';
        appendLog('error', `${fileName}: ${error.message}`);
      });

      instance.on('complete', (result: UploadResult<UppyMeta, UppyBody>) => {
        const run = async () => {
        const successful = result.successful ?? [];
        const failed = result.failed ?? [];
        const successCount = successful.length;
        const failedCount = failed.length;
        let summary = `Complete: ${successCount} succeeded, ${failedCount} failed.`;

        if (uploadMode === 'xhr_ingest') {
          const statusSummary = successful
            .map((file) => {
              const body = (file.response?.body ?? null) as IngestResponse | null;
              if (!body?.status) return null;
              const sourceSuffix = body.source_uid ? ` (${body.source_uid.slice(0, 8)}...)` : '';
              return `${file.name}: ${body.status}${sourceSuffix}`;
            })
            .filter(Boolean)
            .join(' | ');
          if (statusSummary.length > 0) {
            summary = `${summary} ${statusSummary}`;
          }
        }

        setLastCompleteSummary(summary);
        appendLog('info', summary);

          if (enableFinalize && successful.length > 0) {
            const endpoint = finalizeEndpoint.trim();
            if (!endpoint) {
              appendLog('error', 'Finalize is enabled, but finalize endpoint is empty.');
              return;
            }

            const payload = {
              project_id: projectId,
              upload_mode: uploadMode,
              uploaded_at: new Date().toISOString(),
              files: successful.map((file) => ({
                id: file.id,
                name: file.name,
                size: file.size ?? null,
                mime_type: file.type ?? null,
                source: file.source ?? null,
                upload_url: file.response?.uploadURL ?? null,
                response_status: file.response?.status ?? null,
                ingest_response: uploadMode === 'xhr_ingest'
                  ? ((file.response?.body ?? null) as IngestResponse | null)
                  : null,
              })),
            };

            const headers = new Headers({ 'Content-Type': 'application/json' });
            if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
            if (SUPABASE_ANON_KEY) headers.set('apikey', SUPABASE_ANON_KEY);

            try {
              const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                const text = await response.text();
                appendLog('error', `Finalize failed: HTTP ${response.status} ${text.slice(0, 240)}`);
                return;
              }

              appendLog('info', `Finalize acknowledged by ${endpoint}`);
            } catch (e) {
              appendLog('error', `Finalize network error: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        };

        void run();
      });

      setSetupError(null);
      setUppy(instance);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setSetupError(message);
      setUppy(null);
      appendLog('error', message);
      instance.destroy();
      return;
    }

    return () => {
      instance.destroy();
    };
  }, [
    appendLog,
    companionUrl,
    enableFinalize,
    finalizeEndpoint,
    ingestEndpoint,
    projectId,
    session?.access_token,
    tusEndpoint,
    uploadMode,
    useCompanion,
  ]);

  if (!projectId) return null;

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'ELT', href: '/app/elt' },
          { label: 'Project', href: `/app/elt/${projectId}` },
          { label: 'Upload' },
          { label: 'Uppy Library Demo' },
        ]}
      />

      <PageHeader
        title="Uppy Library Demo"
        subtitle="Separate sandbox page to validate uploader behavior before schema-level integration."
      >
        <Button variant="outline" onClick={() => navigate(`/app/elt/${projectId}`)}>
          Back to Current Uploader
        </Button>
      </PageHeader>

      <div className="mb-4 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold">Integration Steps (restart-safe)</span>
          <span className="text-sm">1. Uppy is used only as the UI upload library.</span>
          <span className="text-sm">2. Upload transport is plugin-based: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">XHR ingest</code> (active pipeline) or <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">Tus</code> (resumable).</span>
          <span className="text-sm">3. Companion is optional and only for remote cloud source selection.</span>
          <span className="text-sm">4. Optional finalize callback can be enabled to wire post-upload orchestration later.</span>
          <span className="text-sm">5. This page is isolated from current production uploader behavior.</span>
        </div>
      </div>

      <div className="mb-4 rounded-lg border p-4">
        <div className="flex flex-col gap-3">
          <SegmentGroupRoot
            value={uploadMode}
            onValueChange={(e) => setUploadMode(e.value as UploadMode)}
          >
            <SegmentGroupIndicator />
            {[{ label: 'XHR -> ingest edge', value: 'xhr_ingest' }, { label: 'Tus resumable', value: 'tus' }].map((opt) => (
              <SegmentGroupItem key={opt.value} value={opt.value}>
                <SegmentGroupItemText>{opt.label}</SegmentGroupItemText>
                <SegmentGroupItemHiddenInput />
              </SegmentGroupItem>
            ))}
          </SegmentGroupRoot>

          {uploadMode === 'tus' && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tus Endpoint</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={tusEndpoint}
                onChange={(e) => setTusEndpoint(e.currentTarget.value)}
                placeholder="https://your-tusd.example/files/"
              />
            </div>
          )}

          <Switch.Root
            checked={useCompanion}
            onCheckedChange={(details) => setUseCompanion(details.checked)}
            className="inline-flex items-center gap-2"
          >
            <Switch.HiddenInput />
            <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
              <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Control>
            <Switch.Label className="text-sm">Enable Companion Remote Sources</Switch.Label>
          </Switch.Root>

          {useCompanion && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Companion URL</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={companionUrl}
                onChange={(e) => setCompanionUrl(e.currentTarget.value)}
                placeholder="https://companion.your-domain.example"
              />
            </div>
          )}

          <Switch.Root
            checked={enableFinalize}
            onCheckedChange={(details) => setEnableFinalize(details.checked)}
            className="inline-flex items-center gap-2"
          >
            <Switch.HiddenInput />
            <Switch.Control className="relative h-6 w-11 rounded-full border border-input bg-muted transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary">
              <Switch.Thumb className="block h-5 w-5 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5" />
            </Switch.Control>
            <Switch.Label className="text-sm">Enable finalize callback after successful uploads</Switch.Label>
          </Switch.Root>

          {enableFinalize && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Finalize Endpoint</label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={finalizeEndpoint}
                onChange={(e) => setFinalizeEndpoint(e.currentTarget.value)}
                placeholder="https://your-api.example/upload/finalize"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={ingestEndpoint ? 'green' : 'gray'}>
              XHR ingest {ingestEndpoint ? 'ready' : 'missing'}
            </Badge>
            <Badge variant={tusEndpoint.trim() ? 'green' : 'gray'}>
              Tus {tusEndpoint.trim() ? 'ready' : 'missing'}
            </Badge>
            <Badge variant={!useCompanion || companionUrl.trim() ? 'green' : 'yellow'}>
              Companion {!useCompanion ? 'off' : companionUrl.trim() ? 'ready' : 'missing'}
            </Badge>
            <Badge variant={!enableFinalize || finalizeEndpoint.trim() ? 'green' : 'yellow'}>
              Finalize {!enableFinalize ? 'off' : finalizeEndpoint.trim() ? 'ready' : 'missing'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Project scope: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{projectId}</code>
            </span>
            <Button variant="ghost" size="sm" onClick={clearLogs}>
              Clear logs
            </Button>
          </div>
        </div>
      </div>

      {setupError && (
        <ErrorAlert message={setupError} />
      )}

      <div className="mb-4 rounded-lg border p-4">
        {uppy ? (
          <Dashboard
            uppy={uppy}
            width="100%"
            height={430}
            proudlyDisplayPoweredByUppy={false}
            note="Demo page: uploader transport is tested here; database writes remain backend-owned."
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            Uppy is not initialized due to setup constraints.
          </span>
        )}
      </div>

      <div className="mb-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Latest Completion</span>
          <Badge variant={lastCompleteSummary ? 'green' : 'gray'}>
            {lastCompleteSummary ? 'available' : 'none yet'}
          </Badge>
        </div>
        <span className={`mt-1.5 block text-sm ${lastCompleteSummary ? '' : 'text-muted-foreground'}`}>
          {lastCompleteSummary ?? 'Upload a batch to view completion summary.'}
        </span>
      </div>

      <div className="rounded-lg border p-4">
        <span className="mb-1.5 block font-semibold">Runtime Log</span>
        <div className="flex flex-col gap-1">
          {logs.length === 0 && (
            <span className="text-sm text-muted-foreground">No events yet.</span>
          )}
          {logs.map((entry, idx) => (
            <span key={`${entry.at}-${idx}`} className={`text-xs ${entry.level === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              [{entry.at}] {entry.level.toUpperCase()}: {entry.message}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
