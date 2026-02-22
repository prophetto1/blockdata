import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, Code, Group, Paper, SegmentedControl, Stack, Switch, Text, TextInput } from '@mantine/core';
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
          { label: 'Projects', href: '/app/projects' },
          { label: 'Project', href: `/app/projects/${projectId}` },
          { label: 'Upload' },
          { label: 'Uppy Library Demo' },
        ]}
      />

      <PageHeader
        title="Uppy Library Demo"
        subtitle="Separate sandbox page to validate uploader behavior before schema-level integration."
      >
        <Button variant="default" onClick={() => navigate(`/app/projects/${projectId}/upload`)}>
          Back to Current Uploader
        </Button>
      </PageHeader>

      <Paper withBorder p="md" radius="md" mb="md">
        <Stack gap="xs">
          <Text fw={600}>Integration Steps (restart-safe)</Text>
          <Text size="sm">1. Uppy is used only as the UI upload library.</Text>
          <Text size="sm">2. Upload transport is plugin-based: <Code>XHR ingest</Code> (active pipeline) or <Code>Tus</Code> (resumable).</Text>
          <Text size="sm">3. Companion is optional and only for remote cloud source selection.</Text>
          <Text size="sm">4. Optional finalize callback can be enabled to wire post-upload orchestration later.</Text>
          <Text size="sm">5. This page is isolated from current production uploader behavior.</Text>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md" mb="md">
        <Stack gap="sm">
          <SegmentedControl
            value={uploadMode}
            onChange={(value) => setUploadMode(value as UploadMode)}
            data={[
              { label: 'XHR -> ingest edge', value: 'xhr_ingest' },
              { label: 'Tus resumable', value: 'tus' },
            ]}
          />

          {uploadMode === 'tus' && (
            <TextInput
              label="Tus Endpoint"
              value={tusEndpoint}
              onChange={(event) => setTusEndpoint(event.currentTarget.value)}
              placeholder="https://your-tusd.example/files/"
            />
          )}

          <Switch
            checked={useCompanion}
            onChange={(event) => setUseCompanion(event.currentTarget.checked)}
            label="Enable Companion Remote Sources"
          />

          {useCompanion && (
            <TextInput
              label="Companion URL"
              value={companionUrl}
              onChange={(event) => setCompanionUrl(event.currentTarget.value)}
              placeholder="https://companion.your-domain.example"
            />
          )}

          <Switch
            checked={enableFinalize}
            onChange={(event) => setEnableFinalize(event.currentTarget.checked)}
            label="Enable finalize callback after successful uploads"
          />

          {enableFinalize && (
            <TextInput
              label="Finalize Endpoint"
              value={finalizeEndpoint}
              onChange={(event) => setFinalizeEndpoint(event.currentTarget.value)}
              placeholder="https://your-api.example/upload/finalize"
            />
          )}

          <Group gap="xs" wrap="wrap">
            <Badge color={ingestEndpoint ? 'green' : 'gray'} variant="light">
              XHR ingest {ingestEndpoint ? 'ready' : 'missing'}
            </Badge>
            <Badge color={tusEndpoint.trim() ? 'green' : 'gray'} variant="light">
              Tus {tusEndpoint.trim() ? 'ready' : 'missing'}
            </Badge>
            <Badge color={!useCompanion || companionUrl.trim() ? 'green' : 'yellow'} variant="light">
              Companion {!useCompanion ? 'off' : companionUrl.trim() ? 'ready' : 'missing'}
            </Badge>
            <Badge color={!enableFinalize || finalizeEndpoint.trim() ? 'green' : 'yellow'} variant="light">
              Finalize {!enableFinalize ? 'off' : finalizeEndpoint.trim() ? 'ready' : 'missing'}
            </Badge>
          </Group>

          <Group justify="space-between" wrap="wrap">
            <Text size="xs" c="dimmed">
              Project scope: <Code>{projectId}</Code>
            </Text>
            <Button size="compact-sm" variant="subtle" onClick={clearLogs}>
              Clear logs
            </Button>
          </Group>
        </Stack>
      </Paper>

      {setupError && (
        <ErrorAlert message={setupError} />
      )}

      <Paper withBorder p="md" radius="md" mb="md">
        {uppy ? (
          <Dashboard
            uppy={uppy}
            width="100%"
            height={430}
            proudlyDisplayPoweredByUppy={false}
            note="Demo page: uploader transport is tested here; database writes remain backend-owned."
          />
        ) : (
          <Text size="sm" c="dimmed">
            Uppy is not initialized due to setup constraints.
          </Text>
        )}
      </Paper>

      <Paper withBorder p="md" radius="md" mb="md">
        <Group justify="space-between">
          <Text fw={600}>Latest Completion</Text>
          <Badge variant="light" color={lastCompleteSummary ? 'green' : 'gray'}>
            {lastCompleteSummary ? 'available' : 'none yet'}
          </Badge>
        </Group>
        <Text size="sm" mt="xs" c={lastCompleteSummary ? undefined : 'dimmed'}>
          {lastCompleteSummary ?? 'Upload a batch to view completion summary.'}
        </Text>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="xs">Runtime Log</Text>
        <Stack gap={4}>
          {logs.length === 0 && (
            <Text size="sm" c="dimmed">No events yet.</Text>
          )}
          {logs.map((entry, idx) => (
            <Text key={`${entry.at}-${idx}`} size="xs" c={entry.level === 'error' ? 'red' : 'dimmed'}>
              [{entry.at}] {entry.level.toUpperCase()}: {entry.message}
            </Text>
          ))}
        </Stack>
      </Paper>
    </>
  );
}
