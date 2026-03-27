import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  computeSourceUid,
  prepareSourceUpload,
  uploadWithReservation,
} from './storageUploadService';
import { platformApiFetch } from '@/lib/platformApi';

vi.mock('@/lib/platformApi', () => ({
  platformApiFetch: vi.fn(),
}));

const platformApiFetchMock = vi.mocked(platformApiFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

describe('storageUploadService', () => {
  beforeEach(() => {
    platformApiFetchMock.mockReset();
    vi.restoreAllMocks();
  });

  it('computes the same source_uid as the current ingest flow', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'sample.pdf', { type: 'application/pdf' });
    const prefix = new TextEncoder().encode('pdf\n');
    const combined = new Uint8Array(prefix.length + 3);
    combined.set(prefix, 0);
    combined.set([1, 2, 3], prefix.length);
    const digest = await crypto.subtle.digest('SHA-256', combined);
    const expected = bytesToHex(new Uint8Array(digest));

    const sourceUid = await computeSourceUid(file, 'pdf');

    expect(sourceUid).toBe(expected);
  });

  it('prepares a source upload payload with doc_title and source_type', async () => {
    const file = new File(['hello'], 'outline.pdf', { type: 'application/pdf' });

    const prepared = await prepareSourceUpload(file, { docTitle: 'Folder/Outline.pdf' });

    expect(prepared).toMatchObject({
      filename: 'outline.pdf',
      content_type: 'application/pdf',
      expected_bytes: 5,
      storage_kind: 'source',
      source_type: 'pdf',
      doc_title: 'Folder/Outline.pdf',
    });
    expect(prepared.source_uid).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reserves, uploads, and completes a source upload through the storage api', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    platformApiFetchMock
      .mockResolvedValueOnce(jsonResponse({
        reservation_id: 'res-1',
        signed_upload_url: 'https://upload.example/res-1',
      }))
      .mockResolvedValueOnce(jsonResponse({
        storage_object_id: 'obj-1',
        object_key: 'users/user-1/projects/project-1/sources/abc/source/outline.pdf',
        byte_size: 5,
      }));

    const file = new File(['hello'], 'outline.pdf', { type: 'application/pdf' });

    const result = await uploadWithReservation({
      projectId: 'project-1',
      file,
      docTitle: 'Folder/Outline.pdf',
    });

    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/storage/uploads',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://upload.example/res-1',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      }),
    );
    expect(platformApiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/storage/uploads/res-1/complete',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual_bytes: 5 }),
      },
    );
    expect(result.sourceUid).toMatch(/^[0-9a-f]{64}$/);
    expect(result.completed.storage_object_id).toBe('obj-1');
  });
});
