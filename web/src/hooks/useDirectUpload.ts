import { useCallback, useRef, useState } from 'react';
import { edgeFetch } from '@/lib/edge';

type IngestResponse = {
  source_uid?: string;
  status?: string;
  error?: string;
};

export type StagedFile = {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
};

export type UploadStatus = 'idle' | 'uploading' | 'done';

async function uploadOneFile(
  file: File,
  projectId: string,
): Promise<IngestResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('project_id', projectId);
  form.append('ingest_mode', 'upload_only');

  const resp = await edgeFetch('ingest', { method: 'POST', body: form });
  const body = (await resp.json()) as IngestResponse;
  if (!resp.ok) {
    throw new Error(body.error ?? `HTTP ${resp.status}`);
  }
  return body;
}

export function useDirectUpload(projectId: string) {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const abortRef = useRef(false);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.file.name}:${f.file.size}`));
      const newFiles = incoming
        .filter((f) => !existing.has(`${f.name}:${f.size}`))
        .map((f) => ({
          id: `${f.name}-${f.size}-${Date.now()}`,
          file: f,
          status: 'pending' as const,
          progress: 0,
        }));
      return [...prev, ...newFiles];
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setFiles((prev) => prev.filter((f) => f.status !== 'done'));
    setUploadStatus('idle');
  }, []);

  const startUpload = useCallback(async (): Promise<string[]> => {
    abortRef.current = false;
    setUploadStatus('uploading');

    const sourceUids: string[] = [];

    const pending = files.filter((f) => f.status === 'pending');
    for (const staged of pending) {
      if (abortRef.current) break;

      setFiles((prev) =>
        prev.map((f) => (f.id === staged.id ? { ...f, status: 'uploading' as const, progress: 0 } : f)),
      );

      try {
        const resp = await uploadOneFile(staged.file, projectId);
        if (resp.source_uid) sourceUids.push(resp.source_uid);
        setFiles((prev) =>
          prev.map((f) => (f.id === staged.id ? { ...f, status: 'done' as const, progress: 100 } : f)),
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === staged.id
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : String(err) }
              : f,
          ),
        );
      }
    }

    setUploadStatus('done');
    return sourceUids;
  }, [files, projectId]);

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return { files, uploadStatus, pendingCount, addFiles, removeFile, clearDone, startUpload };
}