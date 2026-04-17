import { restoreDirectoryHandle } from '@/lib/fs-access';
import type { CaptureSessionDetail, CaptureWorkerResult } from './design-captures.types';

type SavedCapturePaths = {
  reportRelativePath: string | null;
  viewportRelativePath: string | null;
  fullPageRelativePath: string | null;
};

function base64ToBytes(base64: string): Uint8Array {
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function ensureDirectoryHandle(
  rootHandle: FileSystemDirectoryHandle,
  segments: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = rootHandle;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create: true });
  }
  return current;
}

async function writeBytesFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  bytes: Uint8Array,
): Promise<void> {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(bytes);
  await writable.close();
}

async function writeTextFile(
  directoryHandle: FileSystemDirectoryHandle,
  fileName: string,
  text: string,
): Promise<void> {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await (fileHandle as any).createWritable();
  await writable.write(text);
  await writable.close();
}

async function readFileByRelativePath(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<File> {
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length === 0) {
    throw new Error('Missing artifact path.');
  }

  const fileName = segments.pop();
  if (!fileName) {
    throw new Error('Missing artifact file name.');
  }

  let current = rootHandle;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment);
  }

  const fileHandle = await current.getFileHandle(fileName);
  return fileHandle.getFile();
}

export async function getCaptureSessionDirectoryHandle(directoryHandleKey: string): Promise<FileSystemDirectoryHandle> {
  const handle = await restoreDirectoryHandle(directoryHandleKey);
  if (!handle) {
    throw new Error('This session folder is no longer connected. Recreate the session or pick the folder again.');
  }

  const permissionHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
    requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>;
  };

  const queryPermission = permissionHandle.queryPermission?.bind(permissionHandle);
  const requestPermission = permissionHandle.requestPermission?.bind(permissionHandle);

  if (queryPermission) {
    const current = await queryPermission({ mode: 'readwrite' });
    if (current !== 'granted' && requestPermission) {
      const requested = await requestPermission({ mode: 'readwrite' });
      if (requested !== 'granted') {
        throw new Error('Folder permission was not granted.');
      }
    } else if (current !== 'granted') {
      throw new Error('Folder permission was not granted.');
    }
  }

  return handle;
}

export async function saveCaptureArtifacts(
  rootHandle: FileSystemDirectoryHandle,
  capture: CaptureWorkerResult,
): Promise<SavedCapturePaths> {
  const captureDir = await ensureDirectoryHandle(rootHandle, ['captures', capture.captureId]);
  await writeTextFile(captureDir, capture.reportFileName, `${JSON.stringify(capture.report, null, 2)}\n`);

  const reportRelativePath = `captures/${capture.captureId}/${capture.reportFileName}`;
  let viewportRelativePath: string | null = null;
  let fullPageRelativePath: string | null = null;

  if (capture.viewportScreenshot) {
    await writeBytesFile(
      captureDir,
      capture.viewportScreenshot.fileName,
      base64ToBytes(capture.viewportScreenshot.base64),
    );
    viewportRelativePath = `captures/${capture.captureId}/${capture.viewportScreenshot.fileName}`;
  }

  if (capture.fullPageScreenshot) {
    await writeBytesFile(
      captureDir,
      capture.fullPageScreenshot.fileName,
      base64ToBytes(capture.fullPageScreenshot.base64),
    );
    fullPageRelativePath = `captures/${capture.captureId}/${capture.fullPageScreenshot.fileName}`;
  }

  return {
    reportRelativePath,
    viewportRelativePath,
    fullPageRelativePath,
  };
}

export async function saveSessionManifest(
  rootHandle: FileSystemDirectoryHandle,
  session: CaptureSessionDetail,
): Promise<void> {
  await writeTextFile(rootHandle, 'session.json', `${JSON.stringify(session, null, 2)}\n`);
}

export async function openSavedCaptureArtifact(
  rootHandle: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<void> {
  const file = await readFileByRelativePath(rootHandle, relativePath);
  const blobUrl = URL.createObjectURL(file);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
