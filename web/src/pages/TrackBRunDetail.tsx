import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { edgeJson } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { TrackBArtifactRow, TrackBRunDocRow, TrackBRunGetResponse, TrackBRunStatus } from '@/lib/types';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { JsonViewer } from '@/components/common/JsonViewer';
import { PageHeader } from '@/components/common/PageHeader';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type PreviewManifest = {
  status: 'ready' | 'unavailable';
  preview_type: 'source_pdf' | 'preview_pdf' | 'none';
  source_locator: string;
  source_type: string;
  preview_pdf_storage_key?: string;
  reason?: string;
};

const RUN_STATUS_COLOR: Record<TrackBRunStatus, string> = {
  queued: 'gray',
  running: 'blue',
  partial_success: 'yellow',
  success: 'green',
  failed: 'red',
  cancelled: 'gray',
};

const DOC_STATUS_COLOR: Record<string, string> = {
  queued: 'gray',
  indexing: 'gray',
  downloading: 'cyan',
  partitioning: 'blue',
  chunking: 'indigo',
  enriching: 'violet',
  persisting: 'yellow',
  success: 'green',
  failed: 'red',
  cancelled: 'gray',
};

function shortUid(value: string): string {
  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function shouldRefreshSignedUrls(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('expired') ||
    lower.includes('signature') ||
    lower.includes('token') ||
    lower.includes('failed to fetch');
}

export default function TrackBRunDetail() {
  const { projectId, runUid } = useParams<{ projectId: string; runUid: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string>('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [data, setData] = useState<TrackBRunGetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSourceUid, setSelectedSourceUid] = useState<string | null>(null);
  const [previewManifest, setPreviewManifest] = useState<PreviewManifest | null>(null);
  const [previewManifestError, setPreviewManifestError] = useState<string | null>(null);
  const [previewManifestLoading, setPreviewManifestLoading] = useState(false);
  const [jsonPane, setJsonPane] = useState<'manifest' | 'artifacts'>('manifest');
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [cancelling, setCancelling] = useState(false);
  const [refreshingPreviewUrls, setRefreshingPreviewUrls] = useState(false);
  const { ref: previewRef, width: previewWidth } = useElementSize();
  const manifestRefreshAttemptedRef = useRef<string | null>(null);
  const pdfRefreshAttemptedRef = useRef<string | null>(null);

  const isTerminalRun = data?.run.status === 'success' ||
    data?.run.status === 'partial_success' ||
    data?.run.status === 'failed' ||
    data?.run.status === 'cancelled';

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const { data: projectRow, error: projectErr } = await supabase
      .from(TABLES.projects)
      .select('project_id, project_name, workspace_id')
      .eq('project_id', projectId)
      .maybeSingle();
    if (projectErr) {
      throw new Error(projectErr.message);
    }
    if (!projectRow) {
      throw new Error('Project not found');
    }
    const row = projectRow as { project_id: string; project_name: string; workspace_id: string | null };
    setProjectName(row.project_name);
    if (!row.workspace_id) {
      setWorkspaceId(null);
      setError('Project has no workspace_id; Track B run lookup is unavailable.');
      setLoading(false);
      return;
    }
    setWorkspaceId(row.workspace_id);
  }, [projectId]);

  const loadRun = useCallback(async (silent = false) => {
    if (!workspaceId || !runUid) return;
    if (!silent) setLoading(true);
    try {
      const runData = await edgeJson<TrackBRunGetResponse>(
        `track-b-runs?workspace_id=${encodeURIComponent(workspaceId)}&run_uid=${encodeURIComponent(runUid)}`,
        { method: 'GET' },
      );
      setData(runData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [runUid, workspaceId]);

  const handleCancelRun = useCallback(async () => {
    if (!workspaceId || !runUid) return;
    setCancelling(true);
    try {
      const response = await edgeJson<{ run_uid: string; status: string }>(
        `track-b-runs?workspace_id=${encodeURIComponent(workspaceId)}&run_uid=${encodeURIComponent(runUid)}`,
        { method: 'DELETE' },
      );
      notifications.show({
        color: 'yellow',
        title: 'Track B run cancelled',
        message: `${response.run_uid.slice(0, 8)}... is now ${response.status}.`,
      });
      await loadRun();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      notifications.show({
        color: 'red',
        title: 'Cancel failed',
        message: message.slice(0, 220),
      });
    } finally {
      setCancelling(false);
    }
  }, [loadRun, runUid, workspaceId]);

  const refreshSignedUrls = useCallback(async (reason?: string) => {
    if (refreshingPreviewUrls) return;
    setRefreshingPreviewUrls(true);
    setPreviewManifestError(reason ?? 'Refreshing preview URLs...');
    try {
      await loadRun(true);
      setPreviewManifestError(null);
    } catch (e) {
      setPreviewManifestError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshingPreviewUrls(false);
    }
  }, [loadRun, refreshingPreviewUrls]);

  useEffect(() => {
    void (async () => {
      try {
        await loadProject();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    })();
  }, [loadProject]);

  useEffect(() => {
    if (!workspaceId) {
      if (!loading) {
        setError((prev) => prev ?? 'Project has no workspace_id; Track B run lookup is unavailable.');
      }
      return;
    }
    void loadRun();
  }, [workspaceId, loadRun, loading]);

  useEffect(() => {
    if (!workspaceId || !runUid || isTerminalRun) return;
    const id = window.setInterval(() => {
      void loadRun(true);
    }, 10000);
    return () => window.clearInterval(id);
  }, [workspaceId, runUid, isTerminalRun, loadRun]);

  useEffect(() => {
    if (!data || data.docs.length === 0) {
      setSelectedSourceUid(null);
      return;
    }
    setSelectedSourceUid((prev) => {
      if (prev && data.docs.some((doc) => doc.source_uid === prev)) return prev;
      return data.docs[0].source_uid;
    });
  }, [data]);

  const selectedDoc = useMemo<TrackBRunDocRow | null>(() => {
    if (!data || !selectedSourceUid) return null;
    return data.docs.find((doc) => doc.source_uid === selectedSourceUid) ?? null;
  }, [data, selectedSourceUid]);

  const selectedArtifacts = useMemo<TrackBArtifactRow[]>(() => {
    if (!data || !selectedSourceUid) return [];
    return data.artifacts.filter((artifact) => artifact.source_uid === selectedSourceUid);
  }, [data, selectedSourceUid]);

  const previewManifestArtifact = useMemo<TrackBArtifactRow | null>(() => {
    const manifests = selectedArtifacts.filter((artifact) => artifact.artifact_type === 'preview_manifest_json');
    if (manifests.length === 0) return null;
    return manifests[manifests.length - 1];
  }, [selectedArtifacts]);

  const previewPdfArtifact = useMemo<TrackBArtifactRow | null>(() => {
    const previews = selectedArtifacts.filter((artifact) => artifact.artifact_type === 'preview_pdf');
    if (previews.length === 0) return null;
    return previews[previews.length - 1];
  }, [selectedArtifacts]);

  const previewPdfArtifactFromManifest = useMemo<TrackBArtifactRow | null>(() => {
    const key = previewManifest?.preview_pdf_storage_key;
    if (!key) return null;
    return selectedArtifacts.find((artifact) => artifact.storage_key === key) ?? null;
  }, [previewManifest?.preview_pdf_storage_key, selectedArtifacts]);

  useEffect(() => {
    setPdfPageNumber(1);
    setPdfPageCount(0);
    manifestRefreshAttemptedRef.current = null;
    pdfRefreshAttemptedRef.current = null;
  }, [selectedSourceUid]);

  useEffect(() => {
    if (!previewManifestArtifact) {
      setPreviewManifest(null);
      setPreviewManifestError('No preview manifest artifact found for selected document.');
      return;
    }
    if (!previewManifestArtifact.signed_url) {
      setPreviewManifest(null);
      setPreviewManifestError(previewManifestArtifact.signed_url_error ?? 'Preview manifest signed URL unavailable.');
      return;
    }

    let active = true;
    setPreviewManifestLoading(true);
    setPreviewManifestError(null);
    setPreviewManifest(null);

    const manifestUrl = previewManifestArtifact.signed_url;
    fetch(manifestUrl)
      .then(async (resp) => {
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`Preview manifest download failed: HTTP ${resp.status} ${text.slice(0, 120)}`);
        }
        const manifest = await resp.json() as PreviewManifest;
        if (active) setPreviewManifest(manifest);
      })
      .catch((e) => {
        if (active) {
          const message = e instanceof Error ? e.message : String(e);
          setPreviewManifestError(message);
          if (
            shouldRefreshSignedUrls(message) &&
            manifestRefreshAttemptedRef.current !== manifestUrl
          ) {
            manifestRefreshAttemptedRef.current = manifestUrl;
            void refreshSignedUrls('Preview manifest URL expired. Refreshing signed URLs...');
          }
        }
      })
      .finally(() => {
        if (active) setPreviewManifestLoading(false);
      });

    return () => {
      active = false;
    };
  }, [previewManifestArtifact, refreshSignedUrls]);

  const pdfUrl = useMemo(() => {
    if (previewPdfArtifactFromManifest?.signed_url) {
      return previewPdfArtifactFromManifest.signed_url;
    }
    if (previewPdfArtifact?.signed_url) {
      return previewPdfArtifact.signed_url;
    }
    if (!selectedDoc) return null;
    if (previewManifest?.status === 'ready' && previewManifest.preview_type === 'source_pdf') {
      return selectedDoc.source_signed_url;
    }
    if (!previewManifest && selectedDoc.source_type === 'pdf') {
      return selectedDoc.source_signed_url;
    }
    return null;
  }, [previewPdfArtifactFromManifest, previewPdfArtifact, previewManifest, selectedDoc]);

  const pdfRenderWidth = Math.max(previewWidth - 16, 320);

  const previewFallbackReason = useMemo(() => {
    if (refreshingPreviewUrls) return 'Refreshing preview URLs...';
    if (previewManifestError) return previewManifestError;
    if (!previewManifest) return 'Preview manifest is loading.';
    if (previewManifest.status === 'unavailable') {
      return previewManifest.reason ?? 'Preview unavailable for this document instance.';
    }
    if (previewPdfArtifact?.signed_url_error) {
      return previewPdfArtifact.signed_url_error;
    }
    if (previewPdfArtifactFromManifest?.signed_url_error) {
      return previewPdfArtifactFromManifest.signed_url_error;
    }
    if (!pdfUrl) {
      return selectedDoc?.source_signed_url_error ?? 'Preview signed URL unavailable.';
    }
    return null;
  }, [previewManifestError, previewManifest, previewPdfArtifact, previewPdfArtifactFromManifest, pdfUrl, refreshingPreviewUrls, selectedDoc]);

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <AppBreadcrumbs items={[
        { label: 'Projects', href: '/app/projects' },
        { label: projectName || 'Project', href: projectId ? `/app/projects/${projectId}` : '/app/projects' },
        { label: 'Track B Run' },
      ]}
      />
      <PageHeader title="Track B Run" subtitle={data?.run.run_uid ?? runUid}>
        <Button
          variant="light"
          size="xs"
          onClick={() => navigate(projectId ? `/app/projects/${projectId}/track-b/workbench` : '/app/projects')}
        >
          Open Workbench
        </Button>
        {!isTerminalRun && (
          <Button
            variant="light"
            color="yellow"
            size="xs"
            onClick={() => void handleCancelRun()}
            loading={cancelling}
          >
            Cancel
          </Button>
        )}
        <Button variant="light" size="xs" onClick={() => void loadRun()}>
          Refresh
        </Button>
      </PageHeader>

      {error && <ErrorAlert message={error} />}

      {data && (
        <Card withBorder mb="md">
          <Group gap="lg" wrap="wrap">
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Status</Text>
              <Badge color={RUN_STATUS_COLOR[data.run.status]} variant="light">{data.run.status}</Badge>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Flow</Text>
              <Text size="sm" fw={600}>{data.run.flow_mode}</Text>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Accepted docs</Text>
              <Text size="sm" fw={600}>{data.run.accepted_count}</Text>
            </Stack>
            <Stack gap={2}>
              <Text size="xs" c="dimmed">Rejected docs</Text>
              <Text size="sm" fw={600}>{data.run.rejected_count}</Text>
            </Stack>
          </Group>
          {data.run.error && (
            <>
              <Divider my="sm" />
              <Text size="sm" c="red">{data.run.error}</Text>
            </>
          )}
        </Card>
      )}

      {data && data.docs.length > 0 && (
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, lg: 3 }}>
            <Paper withBorder p="sm" h="100%">
              <Text fw={600} size="sm" mb="xs">Documents</Text>
              <ScrollArea h={620}>
                <Stack gap="xs">
                  {data.docs.map((doc) => (
                    <Button
                      key={doc.source_uid}
                      variant={selectedSourceUid === doc.source_uid ? 'filled' : 'light'}
                      color={selectedSourceUid === doc.source_uid ? 'blue' : 'gray'}
                      justify="space-between"
                      onClick={() => setSelectedSourceUid(doc.source_uid)}
                      styles={{ inner: { width: '100%' } }}
                    >
                      <Group justify="space-between" w="100%" wrap="nowrap">
                        <Text size="xs" truncate>{shortUid(doc.source_uid)}</Text>
                        <Badge size="xs" variant="light" color={DOC_STATUS_COLOR[doc.status] ?? 'gray'}>
                          {doc.status}
                        </Badge>
                      </Group>
                    </Button>
                  ))}
                </Stack>
              </ScrollArea>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Paper withBorder p="sm">
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Preview</Text>
                <Group gap="xs">
                  {selectedDoc?.source_type && (
                    <Badge size="sm" variant="light">{selectedDoc.source_type}</Badge>
                  )}
                  {previewManifest?.status && (
                    <Badge size="sm" variant="light" color={previewManifest.status === 'ready' ? 'green' : 'yellow'}>
                      {previewManifest.status}
                    </Badge>
                  )}
                  <Button
                    size="compact-xs"
                    variant="default"
                    loading={refreshingPreviewUrls}
                    onClick={() => void refreshSignedUrls('Refreshing preview URLs...')}
                  >
                    Refresh URLs
                  </Button>
                </Group>
              </Group>

              <div ref={previewRef}>
                {previewManifestLoading && (
                  <Center py="xl"><Loader size="sm" /></Center>
                )}
                {!previewManifestLoading && pdfUrl && (
                  <Stack gap="sm" align="center">
                    <Document
                      file={pdfUrl}
                      loading={<Loader size="sm" />}
                      onLoadSuccess={({ numPages }) => {
                        setPdfPageCount(numPages);
                        setPdfPageNumber((prev) => Math.min(Math.max(prev, 1), numPages));
                        setPreviewManifestError(null);
                      }}
                      onLoadError={(e) => {
                        const message = e instanceof Error ? e.message : String(e);
                        setPreviewManifestError(message);
                        if (
                          pdfUrl &&
                          shouldRefreshSignedUrls(message) &&
                          pdfRefreshAttemptedRef.current !== pdfUrl
                        ) {
                          pdfRefreshAttemptedRef.current = pdfUrl;
                          void refreshSignedUrls('Preview URL expired. Refreshing signed URLs...');
                        }
                      }}
                    >
                      <Page pageNumber={pdfPageNumber} width={pdfRenderWidth} />
                    </Document>
                    <Group gap="xs">
                      <Button
                        size="compact-xs"
                        variant="light"
                        leftSection={<IconChevronLeft size={14} />}
                        disabled={pdfPageNumber <= 1}
                        onClick={() => setPdfPageNumber((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </Button>
                      <Text size="sm">
                        Page {pdfPageNumber} of {pdfPageCount || 1}
                      </Text>
                      <Button
                        size="compact-xs"
                        variant="light"
                        rightSection={<IconChevronRight size={14} />}
                        disabled={pdfPageNumber >= pdfPageCount}
                        onClick={() => setPdfPageNumber((p) => Math.min(pdfPageCount, p + 1))}
                      >
                        Next
                      </Button>
                    </Group>
                  </Stack>
                )}
                {!previewManifestLoading && !pdfUrl && (
                  <Center py="xl">
                    <Stack gap={4} align="center">
                      <Text size="sm" c="dimmed">Visual preview unavailable right now.</Text>
                      <Text size="xs" c="dimmed" ta="center" maw={420}>
                        {previewFallbackReason}
                      </Text>
                    </Stack>
                  </Center>
                )}
              </div>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 3 }}>
            <Paper withBorder p="sm" h="100%">
              <Group justify="space-between" mb="xs">
                <Text fw={600} size="sm">Run Data</Text>
              </Group>
              <SegmentedControl
                value={jsonPane}
                onChange={(value) => setJsonPane(value as 'manifest' | 'artifacts')}
                data={[
                  { label: 'Manifest', value: 'manifest' },
                  { label: 'Artifacts', value: 'artifacts' },
                ]}
                size="xs"
                fullWidth
                mb="sm"
              />
              {jsonPane === 'manifest' && (
                <JsonViewer
                  value={
                    previewManifest ??
                    { error: previewManifestError ?? 'preview_manifest_not_loaded' }
                  }
                  maxHeight={620}
                />
              )}
              {jsonPane === 'artifacts' && (
                <JsonViewer value={selectedArtifacts} maxHeight={620} />
              )}
            </Paper>
          </Grid.Col>
        </Grid>
      )}

      {data && data.docs.length === 0 && (
        <Paper withBorder p="lg">
          <Text size="sm" c="dimmed">No run documents were returned for this run.</Text>
        </Paper>
      )}

      {!data && !error && (
        <Paper withBorder p="lg">
          <Stack gap="sm">
            <Text size="sm">Track B run response unavailable.</Text>
            <Button size="xs" onClick={() => navigate(`/app/projects/${projectId}`)}>Back to Project</Button>
          </Stack>
        </Paper>
      )}
    </>
  );
}
