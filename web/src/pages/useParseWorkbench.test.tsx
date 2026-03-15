import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ParseArtifactBundle } from './parseArtifacts';
import {
  getParseFileListExtraColumns,
  getDoclingNativeBadgeLabel,
  getDoclingNativeBadgeVariant,
  getDoclingNativeSectionLabel,
  getDoclingNativeIdentityFields,
  getParseDownloadItems,
  getParsedBlockBadgeVariant,
} from './useParseWorkbench';
import { DocumentFileTable } from '@/components/documents/DocumentFileTable';

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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
  pipeline_config: { name: 'Balanced' },
  conv_total_blocks: 42,
};

function createArtifacts(overrides: Partial<ParseArtifactBundle> = {}): ParseArtifactBundle {
  return {
    cacheKey: 'doc-1',
    mode: 'normalized',
    markdown: {
      markdown: '# Sample',
      loading: false,
      error: null,
      downloadUrl: 'https://example.com/sample.md',
      downloadFilename: 'sample.md',
    },
    json: {
      content: null,
      rawText: '{"ok":true}',
      loading: false,
      error: null,
      downloadUrl: 'https://example.com/sample.docling.json',
      downloadFilename: 'sample.docling.json',
    },
    html: {
      loading: false,
      error: null,
      downloadUrl: 'https://example.com/sample.docling.html',
      downloadFilename: 'sample.docling.html',
    },
    blocks: {
      blocks: [],
      rawItems: [],
      loading: false,
      error: null,
    },
    ...overrides,
  };
}

describe('getParsedBlockBadgeVariant', () => {
  it('shows paragraph blocks as green in Parsed Blocks', () => {
    expect(getParsedBlockBadgeVariant('paragraph', {})).toBe('green');
    expect(getParsedBlockBadgeVariant('Paragraph', { paragraph: 'gray' })).toBe('green');
  });

  it('uses the registry color for other block types', () => {
    expect(getParsedBlockBadgeVariant('heading', { heading: 'blue' })).toBe('blue');
  });

  it('falls back to gray when no registry color exists', () => {
    expect(getParsedBlockBadgeVariant('table', {})).toBe('gray');
  });
});

describe('getParseDownloadItems', () => {
  it('includes both markdown and document json downloads for the selected document', () => {
    expect(getParseDownloadItems(createArtifacts())).toEqual([
      expect.objectContaining({
        id: 'docling-markdown',
        label: 'Docling Markdown',
        downloadUrl: 'https://example.com/sample.md',
        downloadFilename: 'sample.md',
      }),
      expect.objectContaining({
        id: 'document-json',
        label: 'Document Json',
        downloadUrl: 'https://example.com/sample.docling.json',
        downloadFilename: 'sample.docling.json',
      }),
      expect.objectContaining({
        id: 'docling-html',
        label: 'Docling HTML',
        downloadUrl: 'https://example.com/sample.docling.html',
        downloadFilename: 'sample.docling.html',
      }),
    ]);
  });

  it('keeps unavailable downloads visible with their error state', () => {
    const items = getParseDownloadItems(createArtifacts({
      markdown: {
        markdown: '',
        loading: false,
        error: 'No markdown artifact',
        downloadUrl: null,
        downloadFilename: null,
      },
    }));

    expect(items[0]).toEqual(expect.objectContaining({
      id: 'docling-markdown',
      error: 'No markdown artifact',
      downloadUrl: null,
    }));
  });
});

describe('getDoclingNativeIdentityFields', () => {
  it('prefers block_uid and source_uid over pointer and pages for first-class Docling-native items', () => {
    expect(getDoclingNativeIdentityFields({
      pointer: '#/texts/0',
      kind: 'text',
      native_label: 'title',
      content: 'Quarterly Review',
      page_no: 1,
      page_nos: [1],
      block_uid: 'conv-1:0',
      source_uid: 'source-1',
    })).toEqual([
      { label: 'Block UID', value: 'conv-1:0' },
      { label: 'Source UID', value: 'source-1' },
    ]);
  });
});

describe('Docling-native workbench labels', () => {
  it('uses the block count in the section label', () => {
    expect(getDoclingNativeSectionLabel(14)).toBe('14 blocks');
    expect(getDoclingNativeSectionLabel(1)).toBe('1 block');
  });

  it('shows one badge using the native Docling type label', () => {
    expect(getDoclingNativeBadgeLabel({
      pointer: '#/texts/0',
      kind: 'text',
      native_label: 'conceptualization',
      content: 'Example',
      page_no: 1,
      page_nos: [1],
      block_uid: 'conv-1:0',
      source_uid: 'source-1',
    })).toBe('conceptualization');
  });

  it('replaces gray and missing Docling-native colors with a non-gray palette', () => {
    expect(getDoclingNativeBadgeVariant({
      pointer: '#/texts/0',
      kind: 'text',
      native_label: 'text',
      content: 'Example',
      page_no: 1,
      page_nos: [1],
      block_uid: 'conv-1:0',
      source_uid: 'source-1',
    }, { text: 'gray' })).toBe('green');

    expect(getDoclingNativeBadgeVariant({
      pointer: '#/groups/0',
      kind: 'group',
      native_label: 'list',
      content: '',
      page_no: null,
      page_nos: [],
      block_uid: 'conv-1:1',
      source_uid: 'source-1',
    }, {})).toBe('orange');

    expect(getDoclingNativeBadgeVariant({
      pointer: '#/texts/1',
      kind: 'text',
      native_label: 'title',
      content: 'Heading',
      page_no: 1,
      page_nos: [1],
      block_uid: 'conv-1:2',
      source_uid: 'source-1',
    }, { title: 'gray' })).toBe('blue');
  });
});

describe('parse file list extra columns', () => {
  it('keeps profile visible where it still fits', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(520);

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
        extraColumns={getParseFileListExtraColumns()}
        className="parse-documents-table parse-documents-table-compact"
      />,
    );

    const headerText = Array.from(container.querySelectorAll('thead th')).map((cell) => cell.textContent?.trim());
    expect(headerText).toContain('Profile');
    expect(headerText).not.toContain('Blocks');
  });

  it('drops profile once the parse pane gets tighter', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(460);

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
        extraColumns={getParseFileListExtraColumns()}
        className="parse-documents-table parse-documents-table-compact"
      />,
    );

    const headerText = Array.from(container.querySelectorAll('thead th')).map((cell) => cell.textContent?.trim());
    expect(headerText).not.toContain('Profile');
    expect(headerText).not.toContain('Blocks');
  });

  it('keeps blocks absent even once the parse pane is truly tight', () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(420);

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
        extraColumns={getParseFileListExtraColumns()}
        className="parse-documents-table parse-documents-table-compact"
      />,
    );

    const headerText = Array.from(container.querySelectorAll('thead th')).map((cell) => cell.textContent?.trim());
    expect(headerText).not.toContain('Profile');
    expect(headerText).not.toContain('Blocks');
  });
});
