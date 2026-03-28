import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDirectUpload } from './useDirectUpload';
import { uploadWithReservation } from '@/lib/storageUploadService';

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
    const firstUpload = createDeferred<{ sourceUid: string }>();
    const secondUpload = createDeferred<{ sourceUid: string }>();
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
      firstUpload.resolve({ sourceUid: 'source-a' });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(uploadWithReservation).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      secondUpload.resolve({ sourceUid: 'source-b' });
      await expect(uploadPromise).resolves.toEqual(['source-a', 'source-b']);
    });
  });
});
