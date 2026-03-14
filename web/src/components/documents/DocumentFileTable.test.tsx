import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { DocumentFileTable } from './DocumentFileTable';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
});

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

describe('DocumentFileTable sizing', () => {
  it('uses compact parse typography when rendered as parse-documents-table', () => {
    const { container } = render(
      <DocumentFileTable
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        className="parse-documents-table"
      />,
    );

    const table = container.querySelector('table');
    const nameCell = container.querySelector('tbody tr td:nth-child(2)');

    expect(table?.className).toContain('text-[length:var(--parse-json-font-size)]');
    expect(table?.className).toContain('leading-[var(--parse-json-line-height)]');
    expect(nameCell?.className).toContain('py-2');
  });

  it('keeps default sizing outside the parse file list', () => {
    const { container } = render(
      <DocumentFileTable
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
      />,
    );

    const table = container.querySelector('table');
    const nameCell = container.querySelector('tbody tr td:nth-child(2)');

    expect(table?.className).toContain('text-sm');
    expect(nameCell?.className).toContain('py-2.5');
  });

  it('uses a stronger active-row treatment in the parse file list', () => {
    const { container } = render(
      <DocumentFileTable
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        activeDoc={baseDoc.source_uid}
        className="parse-documents-table"
      />,
    );

    const row = container.querySelector('tbody tr');

    expect(row?.getAttribute('aria-current')).toBe('true');
    expect(row?.className).toContain('bg-primary/10');
    expect(row?.className).toContain('ring-1');
    expect(row?.className).toContain('ring-inset');
    expect(row?.className).toContain('ring-primary/25');
    expect(row?.className).toContain('font-medium');
  });

  it('uses a denser styling when rendered as the compact parse comparison table', () => {
    const { container } = render(
      <DocumentFileTable
        docs={[baseDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
        className="parse-documents-table parse-documents-table-compact"
      />,
    );

    const table = container.querySelector('table');
    const headerCell = container.querySelector('thead tr th:nth-child(2)');
    const nameCell = container.querySelector('tbody tr td:nth-child(2)');

    expect(table?.className).toContain('text-[12px]');
    expect(table?.className).toContain('leading-5');
    expect(headerCell?.className).toContain('py-1');
    expect(nameCell?.className).toContain('py-1.5');
  });

  it('shows the real file extension for generic binary uploads', () => {
    const binaryDoc = {
      ...baseDoc,
      source_type: 'binary',
      doc_title: 'Comprehensive_AI_Funding_Landscape.json',
      source_locator: 'projects/project-1/source/comprehensive-ai-funding-landscape.json',
      conv_locator: null,
    };

    const { container } = render(
      <DocumentFileTable
        docs={[binaryDoc]}
        loading={false}
        error={null}
        selected={new Set()}
        toggleSelect={() => {}}
        toggleSelectAll={() => {}}
        allSelected={false}
        someSelected={false}
      />,
    );

    const formatCell = container.querySelector('tbody tr td:nth-child(3)');
    expect(formatCell?.textContent).toBe('JSON');
  });
});

