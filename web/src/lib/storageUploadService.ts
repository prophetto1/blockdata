import { sha256 } from '@noble/hashes/sha2';

import {
  cancelUploadReservation,
  postUploadApiJson,
  reserveUploadWithConflictRecovery,
} from '@/lib/uploadReservationRecovery';

const SOURCE_TYPE_BY_EXTENSION: Record<string, string> = {
  adoc: 'asciidoc',
  asciidoc: 'asciidoc',
  md: 'md',
  markdown: 'md',
  docx: 'docx',
  pdf: 'pdf',
  pptx: 'pptx',
  xlsx: 'xlsx',
  html: 'html',
  htm: 'html',
  csv: 'csv',
  txt: 'txt',
  rst: 'rst',
  tex: 'latex',
  latex: 'latex',
  odt: 'odt',
  epub: 'epub',
  rtf: 'rtf',
  org: 'org',
  vtt: 'vtt',
  java: 'java',
  py: 'py',
  js: 'js',
  jsx: 'jsx',
  ts: 'ts',
  tsx: 'tsx',
  go: 'go',
  rs: 'rs',
  cs: 'cs',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  tif: 'image',
  tiff: 'image',
  svg: 'image',
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  ogg: 'audio',
  m4a: 'audio',
};

export type PreparedSourceUpload = {
  filename: string;
  content_type: string;
  expected_bytes: number;
  storage_kind: 'source';
  storage_surface: 'assets';
  source_type: string;
  source_uid: string;
  doc_title: string;
};

export type UploadReservation = {
  reservation_id: string;
  signed_upload_url: string;
};

export type CompletedUpload = {
  storage_object_id: string;
  object_key: string;
  byte_size: number;
};

export type UploadWithReservationResult = {
  sourceUid: string;
  reservation: UploadReservation;
  completed: CompletedUpload;
};

function mapSignedUploadError(error: unknown): Error {
  if (error instanceof Error && /failed to fetch/i.test(error.message)) {
    return new Error(
      'Storage upload could not reach Google Cloud Storage. This usually means the bucket CORS policy does not allow this app origin yet.',
    );
  }
  if (error instanceof TypeError) {
    return new Error(
      'Storage upload failed before the request completed. Verify the bucket CORS policy for this app origin.',
    );
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('Storage upload failed before the request completed.');
}

function normalizeExtension(value: string): string {
  return value.trim().toLowerCase().replace(/^\./, '');
}

function detectExtension(filename: string): string | null {
  const normalized = filename.trim().toLowerCase();
  const index = normalized.lastIndexOf('.');
  if (index < 0 || index === normalized.length - 1) return null;
  return normalizeExtension(normalized.slice(index + 1));
}

function sourceTypeFromMimeType(mimeType: string): string | null {
  const normalized = mimeType.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'text/vtt' || normalized === 'application/vtt') return 'vtt';
  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('audio/')) return 'audio';
  return null;
}

export function detectSourceTypeForUpload(filename: string, browserMime = ''): string {
  const extension = detectExtension(filename);
  if (extension) {
    const byExtension = SOURCE_TYPE_BY_EXTENSION[extension];
    if (byExtension) return byExtension;
  }

  const byMimeType = sourceTypeFromMimeType(browserMime);
  if (byMimeType) return byMimeType;

  return 'binary';
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeSourceUid(file: File, sourceType: string): Promise<string> {
  const hasher = sha256.create();
  hasher.update(new TextEncoder().encode(`${sourceType}\n`));

  if (typeof file.stream === 'function') {
    const reader = file.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) hasher.update(value);
    }
  } else {
    // Compatibility fallback for older File implementations; this reads the
    // entire file into memory because streaming is not available.
    hasher.update(new Uint8Array(await file.arrayBuffer()));
  }

  return bytesToHex(hasher.digest());
}

export async function prepareSourceUpload(
  file: File,
  options: { docTitle?: string } = {},
): Promise<PreparedSourceUpload> {
  const sourceType = detectSourceTypeForUpload(file.name, file.type);
  const sourceUid = await computeSourceUid(file, sourceType);

  return {
    filename: file.name,
    content_type: file.type || 'application/octet-stream',
    expected_bytes: file.size,
    storage_kind: 'source',
    storage_surface: 'assets',
    source_type: sourceType,
    source_uid: sourceUid,
    doc_title: options.docTitle?.trim() || file.name,
  };
}

export async function uploadWithReservation(params: {
  projectId: string;
  file: File;
  docTitle?: string;
}): Promise<UploadWithReservationResult> {
  const prepared = await prepareSourceUpload(params.file, { docTitle: params.docTitle });
  const reservation = await reserveUploadWithConflictRecovery(() => (
    postUploadApiJson<UploadReservation>('/storage/uploads', {
      project_id: params.projectId,
      ...prepared,
    })
  ));

  let uploadResponse: Response;
  try {
    uploadResponse = await fetch(reservation.signed_upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': prepared.content_type },
      body: params.file,
    });
  } catch (error) {
    await cancelUploadReservation(reservation.reservation_id);
    throw mapSignedUploadError(error);
  }

  if (!uploadResponse.ok) {
    await cancelUploadReservation(reservation.reservation_id);
    throw new Error(`signed upload failed: ${uploadResponse.status}`);
  }

  const completed = await postUploadApiJson<CompletedUpload>(
    `/storage/uploads/${reservation.reservation_id}/complete`,
    { actual_bytes: params.file.size },
    'storage upload completion failed',
  );

  return {
    sourceUid: prepared.source_uid,
    reservation,
    completed,
  };
}
