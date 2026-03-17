import { extractDoclingNativeItemsFromText, type DoclingNativeItem } from '@/lib/doclingNativeItems';
import {
  getFilenameFromLocator,
  resolveSignedUrlForLocators,
  type ProjectDocumentRow,
  type SignedUrlResult,
} from '@/lib/projectDetailHelpers';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { BlockRow } from '@/lib/types';
import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  loadDocumentViewMode,
  type DocumentViewMode,
} from '@/pages/superuser/documentViews';

type RepresentationType =
  | 'doclingdocument_json' | 'markdown_bytes' | 'html_bytes'
  | 'tree_sitter_ast_json' | 'tree_sitter_symbols_json';

export type ParseMarkdownState = {
  markdown: string;
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
  downloadFilename: string | null;
};

export type ParseJsonState = {
  content: null;
  rawText: string | null;
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
  downloadFilename: string | null;
};

export type ParseHtmlState = {
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
  downloadFilename: string | null;
};

export type ParseBlocksState = {
  blocks: BlockRow[];
  rawItems: DoclingNativeItem[];
  loading: boolean;
  error: string | null;
};

export type ParseTreeSitterState = {
  rawText: string | null;
  loading: boolean;
  error: string | null;
  downloadUrl: string | null;
  downloadFilename: string | null;
};

export type ParseArtifactBundle = {
  cacheKey: string;
  mode: DocumentViewMode;
  markdown: ParseMarkdownState;
  json: ParseJsonState;
  html: ParseHtmlState;
  blocks: ParseBlocksState;
  treeSitterAst: ParseTreeSitterState;
  treeSitterSymbols: ParseTreeSitterState;
};

export type ParseArtifactsDeps = {
  loadDocumentViewMode: () => Promise<DocumentViewMode>;
  getArtifactLocator: (sourceUid: string, reprType: RepresentationType) => Promise<string | null>;
  resolveSignedUrlForLocators: (locators: Array<string | null | undefined>) => Promise<SignedUrlResult>;
  fetchText: (url: string) => Promise<string>;
  fetchBlocks: (doc: ProjectDocumentRow) => Promise<BlockRow[]>;
};

const defaultDeps: ParseArtifactsDeps = {
  loadDocumentViewMode,
  getArtifactLocator,
  resolveSignedUrlForLocators,
  fetchText: fetchTextFromUrl,
  fetchBlocks: fetchBlocksForDocument,
};

export function getParseArtifactCacheKey(doc: ProjectDocumentRow): string {
  return JSON.stringify({
    source_uid: doc.source_uid,
    conv_uid: doc.conv_uid ?? null,
    status: doc.status,
    conv_total_blocks: doc.conv_total_blocks ?? null,
    pipeline_config: doc.pipeline_config ?? null,
    requested_pipeline_config: doc.requested_pipeline_config ?? null,
    applied_pipeline_config: doc.applied_pipeline_config ?? null,
    parser_runtime_meta: doc.parser_runtime_meta ?? null,
  });
}

export function createLoadingParseArtifactBundle(doc: ProjectDocumentRow): ParseArtifactBundle {
  return {
    cacheKey: getParseArtifactCacheKey(doc),
    mode: DEFAULT_DOCUMENT_VIEW_MODE,
    markdown: {
      markdown: '',
      loading: true,
      error: null,
      downloadUrl: null,
      downloadFilename: null,
    },
    json: {
      content: null,
      rawText: null,
      loading: true,
      error: null,
      downloadUrl: null,
      downloadFilename: null,
    },
    html: {
      loading: true,
      error: null,
      downloadUrl: null,
      downloadFilename: null,
    },
    blocks: {
      blocks: [],
      rawItems: [],
      loading: true,
      error: null,
    },
    treeSitterAst: {
      rawText: null,
      loading: true,
      error: null,
      downloadUrl: null,
      downloadFilename: null,
    },
    treeSitterSymbols: {
      rawText: null,
      loading: true,
      error: null,
      downloadUrl: null,
      downloadFilename: null,
    },
  };
}

export async function primeParseArtifactsForDocument(
  doc: ProjectDocumentRow,
  deps: ParseArtifactsDeps = defaultDeps,
): Promise<ParseArtifactBundle> {
  const [mode, markdown, json, html, blocks, treeSitterAst, treeSitterSymbols] = await Promise.all([
    deps.loadDocumentViewMode().catch(() => DEFAULT_DOCUMENT_VIEW_MODE),
    loadMarkdownArtifact(doc, deps),
    loadJsonArtifact(doc, deps),
    loadHtmlArtifact(doc, deps),
    loadBlocksArtifact(doc, deps),
    loadTreeSitterArtifact(doc, 'tree_sitter_ast_json', 'ast.json', deps),
    loadTreeSitterArtifact(doc, 'tree_sitter_symbols_json', 'symbols.json', deps),
  ]);

  const rawItems = json.rawText
    ? attachBlockIdentityToRawItems(extractDoclingNativeItemsFromText(json.rawText).items, blocks.blocks, doc.source_uid)
    : [];

  return {
    cacheKey: getParseArtifactCacheKey(doc),
    mode,
    markdown,
    json,
    html,
    blocks: {
      ...blocks,
      rawItems,
    },
    treeSitterAst,
    treeSitterSymbols,
  };
}

function attachBlockIdentityToRawItems(
  rawItems: DoclingNativeItem[],
  blocks: BlockRow[],
  sourceUid: string,
): DoclingNativeItem[] {
  const blockUidByPointer = new Map<string, string>();
  for (const block of blocks) {
    const locator = block.block_locator as Record<string, unknown> | null;
    const pointer = typeof locator?.parser_path === 'string'
      ? locator.parser_path
      : typeof locator?.pointer === 'string'
        ? locator.pointer
        : null;
    if (pointer && !blockUidByPointer.has(pointer)) blockUidByPointer.set(pointer, block.block_uid);
  }

  return rawItems.map((item) => ({
    ...item,
    block_uid: blockUidByPointer.get(item.pointer) ?? null,
    source_uid: sourceUid,
  }));
}

async function loadTreeSitterArtifact(
  doc: ProjectDocumentRow,
  reprType: RepresentationType,
  suffix: string,
  deps: ParseArtifactsDeps,
): Promise<ParseTreeSitterState> {
  const locator = await deps.getArtifactLocator(doc.source_uid, reprType);
  if (!locator) {
    return { rawText: null, loading: false, error: null, downloadUrl: null, downloadFilename: null };
  }

  const downloadFilename = getFilenameFromLocator(locator) ?? `${doc.doc_title || 'document'}.${suffix}`;
  const { url: signedUrl, error } = await deps.resolveSignedUrlForLocators([locator]);
  if (!signedUrl) {
    return { rawText: null, loading: false, error: error ?? 'Could not generate download URL.', downloadUrl: null, downloadFilename };
  }

  try {
    const rawText = await deps.fetchText(signedUrl);
    return { rawText, loading: false, error: null, downloadUrl: signedUrl, downloadFilename };
  } catch (err) {
    return { rawText: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load artifact.', downloadUrl: signedUrl, downloadFilename };
  }
}

async function loadMarkdownArtifact(doc: ProjectDocumentRow, deps: ParseArtifactsDeps): Promise<ParseMarkdownState> {
  const locator = await deps.getArtifactLocator(doc.source_uid, 'markdown_bytes');
  if (!locator) {
    return {
      markdown: '',
      loading: false,
      error: 'No Docling markdown artifact is available for this document.',
      downloadUrl: null,
      downloadFilename: null,
    };
  }

  const downloadFilename = getFilenameFromLocator(locator) ?? `${doc.doc_title || 'document'}.md`;
  const { url: signedUrl, error } = await deps.resolveSignedUrlForLocators([locator]);
  if (!signedUrl) {
    return {
      markdown: '',
      loading: false,
      error: error ?? 'Could not generate download URL for the Docling markdown artifact.',
      downloadUrl: null,
      downloadFilename,
    };
  }

  try {
    const markdown = await deps.fetchText(signedUrl);
    return {
      markdown: markdown || '[Empty markdown file]',
      loading: false,
      error: null,
      downloadUrl: signedUrl,
      downloadFilename,
    };
  } catch (err) {
    return {
      markdown: '',
      loading: false,
      error: err instanceof Error ? err.message : 'Failed to load the Docling markdown artifact.',
      downloadUrl: signedUrl,
      downloadFilename,
    };
  }
}

async function loadJsonArtifact(doc: ProjectDocumentRow, deps: ParseArtifactsDeps): Promise<ParseJsonState> {
  const locator = await deps.getArtifactLocator(doc.source_uid, 'doclingdocument_json');
  if (!locator) {
    return {
      content: null,
      rawText: null,
      loading: false,
      error: 'No DoclingDocument JSON available. Reset and re-parse with Docling.',
      downloadUrl: null,
      downloadFilename: null,
    };
  }

  const downloadFilename = getFilenameFromLocator(locator) ?? `${doc.doc_title || 'document'}.docling.json`;
  const { url: signedUrl, error } = await deps.resolveSignedUrlForLocators([locator]);
  if (!signedUrl) {
    return {
      content: null,
      rawText: null,
      loading: false,
      error: error ?? 'Could not generate download URL for the Docling JSON artifact.',
      downloadUrl: null,
      downloadFilename,
    };
  }

  try {
    const rawText = await deps.fetchText(signedUrl);
    return {
      content: null,
      rawText,
      loading: false,
      error: null,
      downloadUrl: signedUrl,
      downloadFilename,
    };
  } catch (err) {
    return {
      content: null,
      rawText: null,
      loading: false,
      error: err instanceof Error ? err.message : 'Failed to load the Docling JSON artifact.',
      downloadUrl: signedUrl,
      downloadFilename,
    };
  }
}

async function loadHtmlArtifact(doc: ProjectDocumentRow, deps: ParseArtifactsDeps): Promise<ParseHtmlState> {
  const locator = await deps.getArtifactLocator(doc.source_uid, 'html_bytes');
  if (!locator) {
    return {
      loading: false,
      error: 'No Docling HTML artifact is available for this document.',
      downloadUrl: null,
      downloadFilename: null,
    };
  }

  const downloadFilename = getFilenameFromLocator(locator) ?? `${doc.doc_title || 'document'}.html`;
  const { url: signedUrl, error } = await deps.resolveSignedUrlForLocators([locator]);
  if (!signedUrl) {
    return {
      loading: false,
      error: error ?? 'Could not generate download URL for the Docling HTML artifact.',
      downloadUrl: null,
      downloadFilename,
    };
  }

  return {
    loading: false,
    error: null,
    downloadUrl: signedUrl,
    downloadFilename,
  };
}

async function getArtifactLocator(sourceUid: string, reprType: RepresentationType): Promise<string | null> {
  const { data } = await supabase
    .from(TABLES.conversionRepresentations)
    .select('artifact_locator')
    .eq('source_uid', sourceUid)
    .eq('representation_type', reprType)
    .maybeSingle();

  return data?.artifact_locator ?? null;
}

async function fetchTextFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load artifact (${response.status}).`);
  }
  return await response.text();
}

async function resolveConvUid(doc: ProjectDocumentRow): Promise<string | null> {
  if (doc.conv_uid) return doc.conv_uid;

  const { data } = await supabase
    .from(TABLES.conversionParsing)
    .select('conv_uid')
    .eq('source_uid', doc.source_uid)
    .maybeSingle();

  return data?.conv_uid ?? null;
}

async function fetchBlocksForDocument(doc: ProjectDocumentRow): Promise<BlockRow[]> {
  const convUid = await resolveConvUid(doc);
  if (!convUid) return [];

  const { data, error } = await supabase
    .from(TABLES.blocks)
    .select('block_uid, conv_uid, block_index, block_type, block_locator, block_content')
    .eq('conv_uid', convUid)
    .order('block_index', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as BlockRow[];
}

async function loadBlocksArtifact(doc: ProjectDocumentRow, deps: ParseArtifactsDeps): Promise<ParseBlocksState> {
  try {
    const blocks = await deps.fetchBlocks(doc);
    if (blocks.length === 0) {
      return {
        blocks: [],
        rawItems: [],
        loading: false,
        error: null,
      };
    }

    return {
      blocks,
      rawItems: [],
      loading: false,
      error: null,
    };
  } catch (err) {
    return {
      blocks: [],
      rawItems: [],
      loading: false,
      error: err instanceof Error ? err.message : 'Failed to load parsed document units.',
    };
  }
}
