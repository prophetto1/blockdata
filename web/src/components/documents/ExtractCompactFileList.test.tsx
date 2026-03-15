import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtractCompactFileList } from './ExtractCompactFileList';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

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

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const width = (target as HTMLElement).clientWidth;
    this.callback([{ contentRect: { width } as DOMRectReadOnly, target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }

  unobserve() {}

  disconnect() {}
}

describe('ExtractCompactFileList', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses a stacked layout when the first column is narrow', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    render(
      <ExtractCompactFileList
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    expect(screen.getByTestId('extract-compact-file-list')).toHaveAttribute('data-layout', 'stacked');
    expect(screen.getByText('1.2 KB')).toBeInTheDocument();
    expect(screen.getByText('parsed')).toBeInTheDocument();
  });

  it('folds the missing extension into the displayed name instead of showing a format badge', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    render(
      <ExtractCompactFileList
        docs={[{
          ...baseDoc,
          source_type: 'md',
          doc_title: 'README',
          source_locator: 'projects/project-1/source/README.md',
        }]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.queryByText('README')).not.toBeInTheDocument();
    expect(screen.queryByText('MD')).not.toBeInTheDocument();
  });

  it('does not show the raw source locator in narrow stacked mode', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    render(
      <ExtractCompactFileList
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    expect(screen.queryByText(baseDoc.source_locator)).not.toBeInTheDocument();
  });

  it('uses border and fill for the active row instead of a ring overlay', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    const { container } = render(
      <ExtractCompactFileList
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    const row = container.querySelector('[aria-current="true"]');
    expect(row?.className).toContain('border-primary/30');
    expect(row?.className).toContain('bg-primary/10');
    expect(row?.className).not.toContain('ring-1');
  });

  it('does not add a separate active label when the row is already shaded', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    render(
      <ExtractCompactFileList
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('keeps file size and parse status together in one metadata row', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    render(
      <ExtractCompactFileList
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    const metadataRow = screen.getByTestId(`extract-compact-meta-${baseDoc.source_uid}`);
    expect(metadataRow).toHaveTextContent('1.2 KB');
    expect(metadataRow).toHaveTextContent('parsed');
  });

  it('forces long narrow names to break instead of overflowing', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);

    const longNameDoc = {
      ...baseDoc,
      doc_title: 'uploads/00303202040304023/really-long-filename-with-no-natural-break-points.pdf',
    };

    render(
      <ExtractCompactFileList
        docs={[longNameDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={longNameDoc.source_uid}
        onDocClick={() => {}}
      />,
    );

    expect(screen.getByText(longNameDoc.doc_title).className).toContain('break-all');
  });

  it('keeps the inline compact layout when there is room', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(520);

    render(
      <ExtractCompactFileList
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={null}
        onDocClick={() => {}}
      />,
    );

    expect(screen.getByTestId('extract-compact-file-list')).toHaveAttribute('data-layout', 'inline');
  });
});
