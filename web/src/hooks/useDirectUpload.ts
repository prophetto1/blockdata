import { useCallback, useRef, useState } from 'react';
import { uploadWithReservation } from '@/lib/storageUploadService';

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
): Promise<{ source_uid?: string }> {
  const result = await uploadWithReservation({
    projectId,
    file,
    docTitle: file.name,
  });
  return {
    source_uid: result.sourceUid,
  };
}

export function useDirectUpload(projectId: string) {
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const abortRef = useRef(false);
  const filesRef = useRef<StagedFile[]>([]);

  const updateFiles = useCallback((updater: (prev: StagedFile[]) => StagedFile[]) => {
    setFiles((prev) => {
      const next = updater(prev);
      filesRef.current = next;
      return next;
    });
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    updateFiles((prev) => {
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
  }, [updateFiles]);

  const removeFile = useCallback((id: string) => {
    updateFiles((prev) => prev.filter((f) => f.id !== id));
  }, [updateFiles]);

  const clearDone = useCallback(() => {
    updateFiles((prev) => prev.filter((f) => f.status !== 'done'));
    setUploadStatus('idle');
  }, [updateFiles]);

  const startUpload = useCallback(async (): Promise<string[]> => {
    abortRef.current = false;
    setUploadStatus('uploading');

    const sourceUids: string[] = [];

    while (true) {
      const staged = filesRef.current.find((f) => f.status === 'pending');
      if (!staged) break;
      if (abortRef.current) break;

      updateFiles((prev) =>
        prev.map((f) => (f.id === staged.id ? { ...f, status: 'uploading' as const, progress: 0 } : f)),
      );

      try {
        const resp = await uploadOneFile(staged.file, projectId);
        if (resp.source_uid) sourceUids.push(resp.source_uid);
        updateFiles((prev) =>
          prev.map((f) => (f.id === staged.id ? { ...f, status: 'done' as const, progress: 100 } : f)),
        );
      } catch (err) {
        updateFiles((prev) =>
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
  }, [projectId, updateFiles]);

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return { files, uploadStatus, pendingCount, addFiles, removeFile, clearDone, startUpload };
}
