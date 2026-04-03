import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const resolveSignedUrlForLocatorsMock = vi.fn();
const fromMock = vi.fn();
const pdfPreviewMock = vi.fn();

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/documents/ProjectParseUploader', () => ({
  ProjectParseUploader: () => <div>Uploader</div>,
}));

vi.mock('@/components/documents/PdfjsExpressPreview', () => ({
  PdfjsExpressPreview: (props: { url: string }) => {
    pdfPreviewMock(props);
    return <div data-testid="pdf-preview">{props.url}</div>;
  },
}));

vi.mock('@/components/documents/DocxPreview', () => ({
  DocxPreview: () => <div>DOCX preview</div>,
}));

vi.mock('@/components/documents/PptxPreview', () => ({
  PptxPreview: () => <div>PPTX preview</div>,
}));

vi.mock('@/lib/projectDetailHelpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/projectDetailHelpers')>(
    '@/lib/projectDetailHelpers',
  );
  return {
    ...actual,
    resolveSignedUrlForLocators: (...args: unknown[]) => resolveSignedUrlForLocatorsMock(...args),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import Upload from './Upload';

describe('Upload shared signed URL resolution', () => {
  beforeEach(() => {
    resolveSignedUrlForLocatorsMock.mockReset();
    fromMock.mockReset();
    pdfPreviewMock.mockClear();

    resolveSignedUrlForLocatorsMock.mockResolvedValue({
      url: 'https://gcs.test/contracts.pdf',
      error: null,
    });

    fromMock.mockImplementation((_table: string) => ({
      select: (selection: string) => ({
        eq: () => {
          if (selection === '*') {
            return {
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      source_uid: 'source-1',
                      owner_id: 'owner-1',
                      conv_uid: null,
                      project_id: 'project-1',
                      source_type: 'pdf',
                      source_filesize: 1024,
                      source_total_characters: null,
                      doc_title: 'Contracts.pdf',
                      status: 'uploaded',
                      uploaded_at: '2026-04-02T00:00:00.000Z',
                      error: null,
                      source_locator:
                        'users/user-1/assets/projects/project-1/sources/source-1/source/contracts.pdf',
                      conv_locator:
                        'users/user-1/assets/projects/project-1/sources/source-1/converted/contracts.pdf',
                    },
                  ],
                  error: null,
                }),
            };
          }

          return {
            maybeSingle: () =>
              Promise.resolve({
                data: { project_name: 'Project 1' },
                error: null,
              }),
          };
        },
      }),
    }));
  });

  it('uses the shared resolver for the selected document preview', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/project-1/upload']}>
        <Routes>
          <Route path="/projects/:projectId/upload" element={<Upload />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(resolveSignedUrlForLocatorsMock).toHaveBeenCalledWith([
        'users/user-1/assets/projects/project-1/sources/source-1/source/contracts.pdf',
        'users/user-1/assets/projects/project-1/sources/source-1/converted/contracts.pdf',
      ]);
    });

    expect(await screen.findByTestId('pdf-preview')).toHaveTextContent(
      'https://gcs.test/contracts.pdf',
    );
  });
});
