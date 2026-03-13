import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewTabPanel } from './PreviewTabPanel';
import { resolveSignedUrlForLocators } from '@/lib/projectDetailHelpers';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/documents/PdfPreview', () => ({
  PdfPreview: ({ url }: { url: string }) => <div data-testid="pdf-preview">{url}</div>,
}));

vi.mock('@/components/documents/PdfResultsHighlighter', () => ({
  PdfResultsHighlighter: ({
    pdfUrl,
    doclingJsonUrl,
    convUid,
  }: {
    pdfUrl: string;
    doclingJsonUrl: string;
    convUid: string;
  }) => (
    <div data-testid="parsed-preview">
      {pdfUrl}|{doclingJsonUrl}|{convUid}
    </div>
  ),
}));

vi.mock('@/components/documents/DocxPreview', () => ({
  DocxPreview: () => <div data-testid="docx-preview" />,
}));

vi.mock('@/components/documents/PptxPreview', () => ({
  PptxPreview: () => <div data-testid="pptx-preview" />,
}));

vi.mock('@/lib/projectDetailHelpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/projectDetailHelpers')>(
    '@/lib/projectDetailHelpers',
  );
  return {
    ...actual,
    resolveSignedUrlForLocators: vi.fn(),
  };
});

const resolveSignedUrlForLocatorsMock = vi.mocked(resolveSignedUrlForLocators);

const baseDoc = {
  source_uid: 'source-1',
  owner_id: 'owner-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'pdf',
  source_filesize: 1234,
  source_total_characters: null,
  doc_title: 'Quarterly Report.pdf',
  status: 'parsed' as const,
  uploaded_at: '2026-03-10T00:00:00.000Z',
  error: null,
  source_locator: 'projects/project-1/source/quarterly-report.pdf',
  conv_locator: 'projects/project-1/converted/quarterly-report.md',
};

describe('PreviewTabPanel parsed PDF toggle', () => {
  beforeEach(() => {
    resolveSignedUrlForLocatorsMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a parsed-view toggle for PDFs with Docling output and switches on click', async () => {
    resolveSignedUrlForLocatorsMock
      .mockResolvedValueOnce({
        url: 'https://example.test/quarterly-report.pdf',
        error: null,
      })
      .mockResolvedValueOnce({
        url: 'https://example.test/quarterly-report.docling.json',
        error: null,
      });

    render(<PreviewTabPanel doc={baseDoc} />);

    expect(await screen.findByTestId('pdf-preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parsed view' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Parsed view' }));

    await waitFor(() => {
      expect(screen.getByTestId('parsed-preview')).toBeInTheDocument();
    });

    expect(screen.getByText(/quarterly-report\.docling\.json/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'File view' })).toBeInTheDocument();
  });

  it('does not show the parsed-view toggle when Docling output is unavailable', async () => {
    resolveSignedUrlForLocatorsMock
      .mockResolvedValueOnce({
        url: 'https://example.test/quarterly-report.pdf',
        error: null,
      })
      .mockResolvedValueOnce({
        url: null,
        error: 'missing docling json',
      });

    render(<PreviewTabPanel doc={baseDoc} />);

    expect(await screen.findByTestId('pdf-preview')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Parsed view' })).not.toBeInTheDocument();
    });
  });
});
