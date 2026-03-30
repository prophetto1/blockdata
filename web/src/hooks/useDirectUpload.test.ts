import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDirectUpload } from './useDirectUpload';
import { uploadWithReservation } from '@/lib/storageUploadService';
import type { UploadWithReservationResult } from '@/lib/storageUploadService';

vi.mock('@/lib/storageUploadService', () => ({
  uploadWithReservation: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useDirectUpload', () => {
  it('uploads files added after the upload loop starts', async () => {
    const firstUpload = createDeferred<UploadWithReservationResult>();
    const secondUpload = createDeferred<UploadWithReservationResult>();
    vi.mocked(uploadWithReservation)
      .mockImplementationOnce(() => firstUpload.promise)
      .mockImplementationOnce(() => secondUpload.promise);

    const { result } = renderHook(() => useDirectUpload('project-1'));
    const fileA = new File(['a'], 'alpha.md', { type: 'text/markdown' });
    const fileB = new File(['b'], 'beta.md', { type: 'text/markdown' });

    act(() => {
      result.current.addFiles([fileA]);
    });

    let uploadPromise!: Promise<string[]>;
    await act(async () => {
      uploadPromise = result.current.startUpload();
      await Promise.resolve();
    });

    expect(uploadWithReservation).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.addFiles([fileB]);
    });

    await act(async () => {
      firstUpload.resolve({
        sourceUid: 'source-a',
        reservation: {
          reservation_id: 'reservation-a',
          signed_upload_url: 'https://example.test/upload-a',
        },
        completed: {
          storage_object_id: 'storage-a',
          object_key: 'uploads/source-a',
          byte_size: 1,
        },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(uploadWithReservation).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      secondUpload.resolve({
        sourceUid: 'source-b',
        reservation: {
          reservation_id: 'reservation-b',
          signed_upload_url: 'https://example.test/upload-b',
        },
        completed: {
          storage_object_id: 'storage-b',
          object_key: 'uploads/source-b',
          byte_size: 1,
        },
      });
      await expect(uploadPromise).resolves.toEqual(['source-a', 'source-b']);
    });
  });
});
