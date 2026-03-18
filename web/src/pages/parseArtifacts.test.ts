import { describe, expect, it, vi } from 'vitest';

import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import {
  createLoadingParseArtifactBundle,
  getParseArtifactCacheKey,
  primeParseArtifactsForDocument,
} from './parseArtifacts';

const baseDoc: ProjectDocumentRow = {
  source_uid: 'source-1',
  owner_id: 'user-1',
  conv_uid: 'conv-1',
  project_id: 'project-1',
  source_type: 'pdf',
  source_filesize: 1024,
  source_total_characters: null,
  doc_title: 'Example.pdf',
  status: 'parsed',
  uploaded_at: '2026-03-14T00:00:00.000Z',
  error: null,
  conv_total_blocks: 2,
  pipeline_config: { name: 'Fast' },
};

describe('getParseArtifactCacheKey', () => {
  it('changes when parse identity changes', () => {
    const initial = getParseArtifactCacheKey(baseDoc);
    const reparsed = getParseArtifactCacheKey({
      ...baseDoc,
      conv_uid: 'conv-2',
      conv_total_blocks: 4,
    });

    expect(reparsed).not.toBe(initial);
  });
});

describe('primeParseArtifactsForDocument', () => {
  it('starts the loading bundle in raw_docling mode by default', () => {
    expect(createLoadingParseArtifactBundle(baseDoc).mode).toBe('raw_docling');
  });

  it('preloads markdown, parsed blocks, and docling json together for the selected document', async () => {
    const loadDocumentViewMode = vi.fn(async () => 'raw_docling' as const);
    const getArtifactLocator = vi.fn(async (
      _sourceUid: string,
      reprType: 'doclingdocument_json' | 'markdown_bytes' | 'html_bytes' | 'tree_sitter_ast_json' | 'tree_sitter_symbols_json',
    ) => {
      if (reprType === 'markdown_bytes') return 'converted/source-1/example.md';
      if (reprType === 'html_bytes') return 'converted/source-1/example.html';
      return 'converted/source-1/example.docling.json';
    });
    const resolveSignedUrlForLocators = vi.fn(async (locators: Array<string | null | undefined>) => ({
      url: `https://example.test/${locators[0]}`,
      error: null,
    }));
    const fetchText = vi.fn(async (url: string) => {
      if (url.endsWith('.md')) return '# Parsed markdown';
      return JSON.stringify({
        body: { children: [{ $ref: '#/texts/0' }] },
        furniture: { children: [] },
        texts: [
          {
            self_ref: '#/texts/0',
            label: 'paragraph',
            text: 'Hello from Docling',
            prov: [{ page_no: 3 }],
          },
        ],
        tables: [],
        pictures: [],
        groups: [],
        key_value_items: [],
        form_items: [],
      });
    });
    const fetchBlocks = vi.fn(async () => ([
      {
        block_uid: 'block-1',
        conv_uid: 'conv-1',
        block_index: 0,
        block_type: 'paragraph',
        block_locator: { page_no: 3, type: 'docling_json_pointer', parser_path: '#/texts/0' },
        block_content: 'Hello from normalized blocks',
      },
    ]));

    const bundle = await primeParseArtifactsForDocument(baseDoc, {
      loadDocumentViewMode,
      getArtifactLocator,
      resolveSignedUrlForLocators,
      fetchText,
      fetchBlocks,
    });

    expect(bundle.mode).toBe('raw_docling');
    expect(bundle.markdown.markdown).toBe('# Parsed markdown');
    expect(bundle.json.rawText).toContain('Hello from Docling');
    expect(bundle.json.content).toBeNull();
    expect(bundle.json.downloadFilename).toBe('example.docling.json');
    expect(bundle.blocks.blocks).toHaveLength(1);
    expect(bundle.blocks.rawItems).toEqual([
      expect.objectContaining({
        block_uid: 'block-1',
        source_uid: 'source-1',
        native_label: 'paragraph',
        content: 'Hello from Docling',
        page_no: 3,
      }),
    ]);
    expect(loadDocumentViewMode).toHaveBeenCalledOnce();
    expect(getArtifactLocator).toHaveBeenCalledTimes(3);
    expect(resolveSignedUrlForLocators).toHaveBeenCalledTimes(3);
    expect(fetchText).toHaveBeenCalledTimes(2);
    expect(fetchBlocks).toHaveBeenCalledWith(baseDoc);
  });
});
