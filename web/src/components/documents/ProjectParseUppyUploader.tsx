import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Center, Loader, Stack, Text, useComputedColorScheme } from '@mantine/core';
import Uppy, { type UploadResult } from '@uppy/core';
import { Dropzone, FilesList, UppyContextProvider, UploadButton } from '@uppy/react';
import Dashboard from '@uppy/react/dashboard';
import UppyRemoteSources from '@uppy/remote-sources';
import XHRUpload from '@uppy/xhr-upload';
import { useAuth } from '@/auth/AuthContext';
import { edgeJson } from '@/lib/edge';

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';
import '@uppy/react/css/style.css';

type IngestMode = 'ingest' | 'upload_only';
type UppyUiVariant = 'dashboard' | 'headless';
type UppyMeta = { project_id: string; ingest_mode: IngestMode };
type UppyBody = Record<string, never>;
type UppyInstance = Uppy<UppyMeta, UppyBody>;
const REMOTE_SOURCE_PLUGINS = ['GoogleDrive', 'Dropbox', 'OneDrive', 'Box', 'Url'] as const;

type IngestResponse = {
  source_uid?: string;
  status?: string;
  error?: string;
};

type UploadPolicyResponse = {
  upload: {
    max_files_per_batch?: number;
    allowed_extensions?: string[];
  };
};

export type UploadBatchResult = {
  uploadedSourceUids: string[];
};

type ProjectParseUppyUploaderProps = {
  projectId: string;
  ingestMode?: IngestMode;
  onBatchUploaded?: (result: UploadBatchResult) => void | Promise<void>;
  height?: number;
  compactUi?: boolean;
  uiVariant?: UppyUiVariant;
  enableRemoteSources?: boolean;
  companionUrl?: string;
  hideHeader?: boolean;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const DEFAULT_MAX_FILES = 10;
const DEFAULT_ALLOWED_EXTENSIONS = ['.md', '.docx', '.pdf', '.pptx', '.xlsx', '.html', '.csv', '.txt'];

function getIngestEndpoint(): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/ingest`;
}

function resolveCompanionUrl(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeAllowedExtensions(value: string[] | undefined): string[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_ALLOWED_EXTENSIONS;
  const normalized = value
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.length > 0)
    .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
  return normalized.length > 0 ? normalized : DEFAULT_ALLOWED_EXTENSIONS;
}

export function ProjectParseUppyUploader({
  projectId,
  ingestMode = 'upload_only',
  onBatchUploaded,
  height = 320,
  compactUi = false,
  uiVariant = 'dashboard',
  enableRemoteSources = false,
  companionUrl,
  hideHeader = false,
}: ProjectParseUppyUploaderProps) {
  const computedColorScheme = useComputedColorScheme('dark');
  const { session } = useAuth();
  const dashboardHostRef = useRef<HTMLDivElement | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>(DEFAULT_ALLOWED_EXTENSIONS);

  const ingestEndpoint = useMemo(() => getIngestEndpoint(), []);
  const resolvedCompanionUrl = useMemo(() => resolveCompanionUrl(companionUrl), [companionUrl]);
  const remoteSourcesEnabled = enableRemoteSources && Boolean(resolvedCompanionUrl);
  const remoteSourcesConfigWarning = enableRemoteSources && !resolvedCompanionUrl
    ? 'Cloud import unavailable: set VITE_UPPY_COMPANION_URL to your Companion service URL.'
    : null;
  const resolvedUiVariant: UppyUiVariant = remoteSourcesEnabled ? 'dashboard' : uiVariant;
  const dropzoneNote = ingestMode === 'upload_only'
    ? 'Drop files here or browse files. Parsing runs later when you click Parse.'
    : 'Drop files here or browse files';

  useEffect(() => {
    let cancelled = false;

    edgeJson<UploadPolicyResponse>('upload-policy', { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        const nextMaxFiles = typeof data.upload.max_files_per_batch === 'number' && data.upload.max_files_per_batch > 0
          ? data.upload.max_files_per_batch
          : DEFAULT_MAX_FILES;
        const nextAllowed = normalizeAllowedExtensions(data.upload.allowed_extensions);
        setMaxFiles(nextMaxFiles);
        setAllowedExtensions(nextAllowed);
      })
      .catch(() => {
        // Keep defaults when policy endpoint is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { uppy, setupError } = useMemo(() => {
    if (!projectId) {
      return { uppy: null as UppyInstance | null, setupError: 'Missing project context.' };
    }
    if (!session?.access_token) {
      return { uppy: null as UppyInstance | null, setupError: 'No active auth session found.' };
    }
    if (!ingestEndpoint || !SUPABASE_ANON_KEY) {
      return { uppy: null as UppyInstance | null, setupError: 'Missing Supabase uploader configuration.' };
    }

    try {
      const instance = new Uppy<UppyMeta, UppyBody>({
        autoProceed: compactUi,
        restrictions: {
          maxNumberOfFiles: maxFiles,
          allowedFileTypes: allowedExtensions,
        },
        meta: {
          project_id: projectId,
          ingest_mode: ingestMode,
        },
      });

      instance.use(XHRUpload, {
        endpoint: ingestEndpoint,
        method: 'post',
        fieldName: 'file',
        formData: true,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        allowedMetaFields: ['project_id', 'ingest_mode'],
      });

      if (remoteSourcesEnabled && resolvedCompanionUrl) {
        instance.use(UppyRemoteSources, {
          companionUrl: resolvedCompanionUrl,
          sources: [...REMOTE_SOURCE_PLUGINS],
        });
      }

      instance.on('upload', () => {
        setSummary(null);
      });

      instance.on('complete', (result: UploadResult<UppyMeta, UppyBody>) => {
        const successful = result.successful ?? [];
        const failed = result.failed ?? [];
        const uploadedSourceUids = Array.from(new Set(
          successful
            .map((file) => {
              const body = (file.response?.body ?? null) as IngestResponse | null;
              return body?.source_uid?.trim() ?? '';
            })
            .filter((sourceUid) => sourceUid.length > 0),
        ));

        const statusSummary = successful
          .map((file) => {
            const body = (file.response?.body ?? null) as IngestResponse | null;
            if (!body?.status) return null;
            const suffix = body.source_uid ? ` (${body.source_uid.slice(0, 8)}...)` : '';
            return `${file.name}: ${body.status}${suffix}`;
          })
          .filter(Boolean)
          .join(' | ');

        const nextSummary = `Uploaded ${successful.length}, failed ${failed.length}${statusSummary ? ` - ${statusSummary}` : ''}`;
        setSummary(nextSummary);

        if (successful.length > 0 && onBatchUploaded) {
          void onBatchUploaded({ uploadedSourceUids });
        }
      });

      instance.on('upload-error', (_file, error) => {
        setSummary(error.message);
      });

      return { uppy: instance, setupError: null as string | null };
    } catch (error) {
      return {
        uppy: null as UppyInstance | null,
        setupError: error instanceof Error ? error.message : String(error),
      };
    }
  }, [allowedExtensions, compactUi, ingestEndpoint, ingestMode, maxFiles, onBatchUploaded, projectId, remoteSourcesEnabled, resolvedCompanionUrl, session]);

  useEffect(() => {
    if (!uppy) return;
    return () => {
      uppy.destroy();
    };
  }, [uppy]);

  useEffect(() => {
    if (resolvedUiVariant !== 'dashboard') return;

    const root = dashboardHostRef.current;
    if (!root) return;

    const addFilesArea = root.querySelector<HTMLElement>('.uppy-Dashboard-AddFiles');
    if (!addFilesArea) return;

    const openFilePicker = () => {
      const browseButton = addFilesArea.querySelector<HTMLButtonElement>('.uppy-Dashboard-browse');
      if (browseButton) {
        browseButton.click();
        return;
      }

      const localFileInput = Array.from(
        root.querySelectorAll<HTMLInputElement>('.uppy-Dashboard-input[type="file"]'),
      ).find((input) => !input.hasAttribute('webkitdirectory'));

      localFileInput?.click();
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('button, a, input, textarea, select, label')) return;
      openFilePicker();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openFilePicker();
    };

    addFilesArea.setAttribute('role', 'button');
    addFilesArea.setAttribute('tabindex', '0');
    addFilesArea.setAttribute('aria-label', 'Choose files to upload');
    addFilesArea.addEventListener('click', handleClick);
    addFilesArea.addEventListener('keydown', handleKeyDown);

    return () => {
      addFilesArea.removeEventListener('click', handleClick);
      addFilesArea.removeEventListener('keydown', handleKeyDown);
      addFilesArea.removeAttribute('role');
      addFilesArea.removeAttribute('tabindex');
      addFilesArea.removeAttribute('aria-label');
    };
  }, [compactUi, resolvedUiVariant, uppy]);

  if (setupError) {
    return <Alert color="red">{setupError}</Alert>;
  }

  if (!uppy) {
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <Stack gap={0}>
      {!hideHeader && (
        <Box className="parse-upload-header">
          <Text fw={700} size="sm">Add Documents</Text>
        </Box>
      )}
      {resolvedUiVariant === 'headless' ? (
        <UppyContextProvider uppy={uppy as unknown as Uppy}>
          <Stack gap={compactUi ? 0 : 'xs'} className={`parse-upload-headless${compactUi ? ' is-compact' : ''}`}>
            <Dropzone
              width="100%"
              height={`${Math.max(120, height)}px`}
              note={compactUi ? undefined : dropzoneNote}
            />
            {!compactUi && (
              <>
                <FilesList />
                <UploadButton />
              </>
            )}
          </Stack>
        </UppyContextProvider>
      ) : (
        <div ref={dashboardHostRef}>
          <Dashboard
            uppy={uppy}
            height={height}
            width="100%"
            showSelectedFiles={false}
            plugins={remoteSourcesEnabled ? [...REMOTE_SOURCE_PLUGINS] : []}
            disableStatusBar={compactUi}
            proudlyDisplayPoweredByUppy={false}
            note={compactUi ? undefined : dropzoneNote}
            hideProgressDetails={false}
            theme={computedColorScheme === 'dark' ? 'dark' : 'light'}
          />
        </div>
      )}
      {remoteSourcesConfigWarning && (
        <Alert color="yellow" mt="xs">{remoteSourcesConfigWarning}</Alert>
      )}
      {summary && (
        <Text size="xs" c="dimmed" lineClamp={1} mt="xs">
          {summary}
        </Text>
      )}
    </Stack>
  );
}
