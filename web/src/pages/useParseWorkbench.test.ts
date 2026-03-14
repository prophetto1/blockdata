import { describe, expect, it } from 'vitest';

import type { ParseArtifactBundle } from './parseArtifacts';
import { getParseDownloadItems, getParsedBlockBadgeVariant } from './useParseWorkbench';

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
