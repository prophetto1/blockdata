import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDirectUpload } from './useDirectUpload';
import { uploadWithReservation } from '@/lib/storageUploadService';

vi.mock('@/lib/edge', () => ({
  edgeFetch: vi.fn(),
}));

vi.mock('@/lib/storageUploadService', () => ({
  uploadWithReservation: vi.fn(),
}));

const uploadWithReservationMock = vi.mocked(uploadWithReservation);

function Harness({
  projectId,
  onUploaded,
}: {
  projectId: string;
  onUploaded: (sourceUids: string[]) => void;
}) {
  const { files, uploadStatus, addFiles, startUpload } = useDirectUpload(projectId);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          addFiles([new File(['hello'], 'outline.pdf', { type: 'application/pdf' })]);
        }}
      >
        Add file
      </button>
      <button
        type="button"
        onClick={() => {
          void startUpload().then(onUploaded);
        }}
      >
        Start upload
      </button>
      <div data-testid="upload-status">{uploadStatus}</div>
      <div data-testid="file-status">{files[0]?.status ?? 'none'}</div>
    </div>
  );
}

describe('useDirectUpload', () => {
  it('uploads staged files through the shared storage upload client', async () => {
    const onUploaded = vi.fn();
    uploadWithReservationMock.mockResolvedValue({
      sourceUid: 'abc123',
      reservation: {
        reservation_id: 'res-1',
        signed_upload_url: 'https://upload.example/res-1',
      },
      completed: {
        storage_object_id: 'obj-1',
        object_key: 'users/user-1/projects/project-1/sources/abc123/source/outline.pdf',
        byte_size: 5,
      },
    });

    render(<Harness projectId="project-1" onUploaded={onUploaded} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start upload' }));

    await waitFor(() => {
      expect(uploadWithReservationMock).toHaveBeenCalledWith({
        projectId: 'project-1',
        file: expect.any(File),
        docTitle: 'outline.pdf',
      });
    });

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(['abc123']);
    });

    expect(screen.getByTestId('upload-status')).toHaveTextContent('done');
    expect(screen.getByTestId('file-status')).toHaveTextContent('done');
  });
});
