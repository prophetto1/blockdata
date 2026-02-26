import { useEffect, useRef, useState } from 'react';
import Uppy, { type UploadResult } from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import UppyRemoteSources from '@uppy/remote-sources';
import { useAuth } from '@/auth/AuthContext';
import { edgeJson } from '@/lib/edge';

type IngestMode = 'ingest' | 'upload_only';
type UppyMeta = { project_id: string; ingest_mode: IngestMode };
type UppyBody = Record<string, never>;

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

export type FileState = {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
  sourceUid?: string;
};

export type TransportStatus = 'idle' | 'uploading' | 'complete' | 'error';

export type UploadBatchResult = {
  uploadedSourceUids: string[];
};

type UseUppyTransportOptions = {
  projectId: string;
  ingestMode?: IngestMode;
  onBatchUploaded?: (result: UploadBatchResult) => void | Promise<void>;
  enableRemoteSources?: boolean;
  companionUrl?: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const DEFAULT_MAX_FILES = 10;
const DEFAULT_ALLOWED_EXTENSIONS = ['.md', '.docx', '.pdf', '.pptx', '.xlsx', '.html', '.csv', '.txt'];
const BLOCKED_COMPANION_HOSTS = new Set(['companion.uppy.io']);

function getIngestEndpoint(): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/ingest`;
}

function resolveCompanionUrl(value: string | undefined): { url: string | null; warning: string | null } {
  const normalized = value?.trim();
  if (!normalized) return { url: null, warning: null };
  try {
    const parsed = new URL(normalized);
    if (BLOCKED_COMPANION_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { url: null, warning: 'Cloud import disabled: companion.uppy.io is not the project Companion service.' };
    }
    return { url: normalized, warning: null };
  } catch {
    return { url: null, warning: 'Cloud import unavailable: VITE_UPPY_COMPANION_URL must be a valid URL.' };
  }
}

function normalizeExtensions(value: string[] | undefined): string[] {
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_ALLOWED_EXTENSIONS;
  const normalized = value
    .map((ext) => ext.trim().toLowerCase())
    .filter((ext) => ext.length > 0)
    .map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
  return normalized.length > 0 ? normalized : DEFAULT_ALLOWED_EXTENSIONS;
}

export function useUppyTransport({
  projectId,
  ingestMode = 'upload_only',
  onBatchUploaded,
  enableRemoteSources = false,
  companionUrl,
}: UseUppyTransportOptions) {
  const { session } = useAuth();
  const [fileStates, setFileStates] = useState<Map<string, FileState>>(new Map());
  const [status, setStatus] = useState<TransportStatus>('idle');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [remoteWarning, setRemoteWarning] = useState<string | null>(null);
  const [maxFiles, setMaxFiles] = useState(DEFAULT_MAX_FILES);
  const [allowedExtensions, setAllowedExtensions] = useState(DEFAULT_ALLOWED_EXTENSIONS);
  const uppyRef = useRef<Uppy<UppyMeta, UppyBody> | null>(null);
  const onBatchUploadedRef = useRef(onBatchUploaded);
  onBatchUploadedRef.current = onBatchUploaded;

  // Fetch upload policy
  useEffect(() => {
    let cancelled = false;
    edgeJson<UploadPolicyResponse>('upload-policy', { method: 'GET' })
      .then((data) => {
        if (cancelled) return;
        const next = typeof data.upload.max_files_per_batch === 'number' && data.upload.max_files_per_batch > 0
          ? data.upload.max_files_per_batch : DEFAULT_MAX_FILES;
        setMaxFiles(next);
        setAllowedExtensions(normalizeExtensions(data.upload.allowed_extensions));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Create/destroy Uppy instance
  useEffect(() => {
    if (!projectId) { setSetupError('Missing project context.'); return; }
    if (!session?.access_token) { setSetupError('No active auth session.'); return; }
    const ingestEndpoint = getIngestEndpoint();
    if (!ingestEndpoint || !SUPABASE_ANON_KEY) { setSetupError('Missing Supabase config.'); return; }

    const companionResolution = resolveCompanionUrl(companionUrl);
    const resolvedCompanionUrl = companionResolution.url;
    const remotesEnabled = enableRemoteSources && Boolean(resolvedCompanionUrl);
    if (enableRemoteSources) {
      setRemoteWarning(
        companionResolution.warning
          ?? (!resolvedCompanionUrl ? 'Cloud import unavailable: set VITE_UPPY_COMPANION_URL.' : null),
      );
    }

    let instance: Uppy<UppyMeta, UppyBody> | null = null;
    try {
      instance = new Uppy<UppyMeta, UppyBody>({
        autoProceed: false,
        restrictions: { maxNumberOfFiles: maxFiles, allowedFileTypes: allowedExtensions },
        meta: { project_id: projectId, ingest_mode: ingestMode },
      });

      instance.use(XHRUpload, {
        endpoint: ingestEndpoint,
        method: 'post',
        fieldName: 'file',
        formData: true,
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_ANON_KEY },
        allowedMetaFields: ['project_id', 'ingest_mode'],
      });

      if (remotesEnabled && resolvedCompanionUrl) {
        instance.use(UppyRemoteSources, {
          companionUrl: resolvedCompanionUrl,
          sources: ['GoogleDrive'],
          companionHeaders: { Authorization: `Bearer ${session.access_token}` },
          companionCookiesRule: 'include',
        });
      }

      instance.on('file-added', (file) => {
        setFileStates((prev) => {
          const next = new Map(prev);
          next.set(file.id, {
            id: file.id,
            name: file.name ?? 'unknown',
            size: file.size ?? 0,
            status: 'pending',
            progress: 0,
          });
          return next;
        });
      });

      instance.on('file-removed', (file) => {
        setFileStates((prev) => {
          const next = new Map(prev);
          next.delete(file.id);
          return next;
        });
      });

      instance.on('upload', () => { setStatus('uploading'); });

      instance.on('upload-progress', (file, progress) => {
        if (!file) return;
        const total = progress.bytesTotal ?? 0;
        const pct = total > 0
          ? Math.round((progress.bytesUploaded / total) * 100)
          : 0;
        setFileStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(file.id);
          if (existing) next.set(file.id, { ...existing, status: 'uploading', progress: pct });
          return next;
        });
      });

      instance.on('upload-success', (file, response) => {
        if (!file) return;
        const body = (response?.body ?? null) as IngestResponse | null;
        setFileStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(file.id);
          if (existing) next.set(file.id, { ...existing, status: 'done', progress: 100, sourceUid: body?.source_uid });
          return next;
        });
      });

      instance.on('upload-error', (file, error) => {
        if (!file) return;
        setFileStates((prev) => {
          const next = new Map(prev);
          const existing = next.get(file.id);
          if (existing) next.set(file.id, { ...existing, status: 'error', errorMessage: error.message });
          return next;
        });
      });

      instance.on('complete', (result: UploadResult<UppyMeta, UppyBody>) => {
        const successful = result.successful ?? [];
        const uploadedSourceUids = Array.from(new Set(
          successful
            .map((f) => ((f.response?.body ?? null) as IngestResponse | null)?.source_uid?.trim() ?? '')
            .filter((uid) => uid.length > 0),
        ));
        setStatus(successful.length > 0 ? 'complete' : 'error');
        if (successful.length > 0 && onBatchUploadedRef.current) {
          void onBatchUploadedRef.current({ uploadedSourceUids });
        }
      });

      uppyRef.current = instance;
      setSetupError(null);
    } catch (err) {
      instance?.destroy();
      setSetupError(err instanceof Error ? err.message : String(err));
      return;
    }

    return () => {
      instance?.destroy();
      uppyRef.current = null;
    };
  }, [allowedExtensions, companionUrl, enableRemoteSources, ingestMode, maxFiles, projectId, session?.access_token]);

  const addFiles = (files: File[]) => {
    const uppy = uppyRef.current;
    if (!uppy) return;
    for (const file of files) {
      try {
        uppy.addFile({ name: file.name, type: file.type, data: file, source: 'local' });
      } catch {
        // Uppy throws on duplicate or restriction violation — silently skip
      }
    }
  };

  const removeFile = (fileId: string) => {
    uppyRef.current?.removeFile(fileId);
  };

  const startUpload = () => {
    uppyRef.current?.upload();
  };

  const remoteSourcesActive = enableRemoteSources && Boolean(resolveCompanionUrl(companionUrl).url);

  return {
    uppy: uppyRef.current,
    fileStates,
    status,
    error: setupError,
    setupError,
    remoteWarning,
    remoteSourcesActive,
    maxFiles,
    allowedExtensions,
    addFiles,
    removeFile,
    startUpload,
  };
}
