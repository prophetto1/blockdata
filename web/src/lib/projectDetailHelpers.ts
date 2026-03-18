import { supabase } from '@/lib/supabase';
import type { DocumentRow } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectDocumentRow = DocumentRow;

export type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'json' | 'markdown' | 'code' | 'docx' | 'xlsx' | 'pptx' | 'file';

export type TestBlockCardRow = {
  blockUid: string;
  blockIndex: number;
  blockType: string;
  parserBlockType: string | null;
  snippet: string;
};

export type SignedUrlResult = {
  url: string | null;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCUMENTS_BUCKET = (import.meta.env.VITE_DOCUMENTS_BUCKET as string | undefined) ?? 'documents';

const TEXT_SOURCE_TYPES = new Set([
  'md',
  'txt',
  'csv',
  'html',
  'asciidoc',
  'xml_uspto',
  'xml_jats',
  'json_docling',
  'rst',
  'latex',
  'org',
  'vtt',
]);
const IMAGE_SOURCE_TYPES = new Set(['image']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff']);
const DOCX_SOURCE_TYPES = new Set([
  'docx',
  'docm',
  'dotx',
  'dotm',
]);
const DOCX_EXTENSIONS = new Set([
  'docx',
  'docm',
  'dotx',
  'dotm',
]);
const PPTX_SOURCE_TYPES = new Set(['pptx', 'pptm', 'ppsx']);
const PPTX_EXTENSIONS = new Set(['pptx', 'pptm', 'ppsx']);
const XLSX_SOURCE_TYPES = new Set(['xlsx']);
const XLSX_EXTENSIONS = new Set(['xlsx']);
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'csv',
  'html',
  'xml',
  'json',
  'rst',
  'tex',
  'org',
  'vtt',
]);

/** Formats for CodePreview — only those NOT already handled by other renderers. */
const CODE_PREVIEW_SOURCE_TYPES = new Set([
  // Code
  'py', 'python', 'js', 'javascript', 'jsx', 'ts', 'typescript', 'tsx',
  'go', 'rs', 'rust', 'cs', 'csharp', 'java',
  'css', 'vue', 'svelte',
  // Data formats not already covered by isJsonDocument/isTextDocument
  'yaml', 'yml', 'toml',
]);

const CODE_PREVIEW_EXTENSIONS = new Set([
  // Code — with language packs
  'py', 'js', 'jsx', 'ts', 'tsx', 'go', 'rs', 'css', 'vue', 'svelte',
  // Code — no language pack (still gets line numbers + monospace)
  'java', 'cs', 'c', 'cpp', 'h', 'hpp', 'rb', 'php', 'sh', 'bash', 'zsh',
  'sql', 'r', 'swift', 'kt', 'scala', 'lua', 'pl', 'ex', 'exs', 'zig',
  // Data
  'yaml', 'yml', 'toml', 'ini', 'env', 'conf', 'cfg',
  // Plain text not in TEXT_EXTENSIONS that should still preview
  'log', 'tsv',
]);

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function downloadFromSignedUrl(signedUrl: string, filename: string): Promise<void> {
  const response = await fetch(signedUrl);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

async function createSignedUrlForLocator(locator: string | null | undefined): Promise<SignedUrlResult> {
  const normalized = locator?.trim();
  if (!normalized) {
    return { url: null, error: 'No file locator was found.' };
  }

  const sourceKey = normalized.replace(/^\/+/, '');
  const { data, error: signedUrlError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(sourceKey, 60 * 20);

  if (signedUrlError) {
    return { url: null, error: signedUrlError.message };
  }
  if (!data?.signedUrl) {
    return { url: null, error: 'Storage did not return a signed URL.' };
  }
  return { url: data.signedUrl, error: null };
}

export async function resolveSignedUrlForLocators(locators: Array<string | null | undefined>): Promise<SignedUrlResult> {
  const errors: string[] = [];
  for (const locator of locators) {
    if (!locator?.trim()) continue;
    const result = await createSignedUrlForLocator(locator);
    if (result.url) return result;
    if (result.error) errors.push(result.error);
  }
  return {
    url: null,
    error: errors[0] ?? 'No previewable file was available for this document.',
  };
}

export function toDoclingJsonLocator(locator: string | null | undefined): string | null {
  const normalized = locator?.trim();
  if (!normalized) return null;
  if (normalized.toLowerCase().endsWith('.docling.json')) return normalized;

  const sibling = toArtifactLocator(normalized, 'docling.json');
  return sibling;
}

export function toArtifactLocator(locator: string | null | undefined, nextExtension: string): string | null {
  const normalized = locator?.trim();
  if (!normalized) return null;

  const lastSlash = normalized.lastIndexOf('/');
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : '';
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  const lowered = filename.toLowerCase();
  let basename = filename;
  const knownSuffixes = ['.docling.json', '.citations.json', '.doctags', '.md', '.html'];
  for (const suffix of knownSuffixes) {
    if (lowered.endsWith(suffix)) {
      basename = filename.slice(0, filename.length - suffix.length);
      break;
    }
  }
  if (basename === filename) {
    const lastDot = filename.lastIndexOf('.');
    basename = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  }
  if (!basename) return null;
  const normalizedExt = nextExtension.replace(/^\.+/, '');
  return `${dir}${basename}.${normalizedExt}`;
}

export function getFilenameFromLocator(locator: string | null | undefined): string | null {
  const normalized = locator?.trim();
  if (!normalized) return null;
  const lastSlash = normalized.lastIndexOf('/');
  const filename = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
  return filename || null;
}

export function dedupeLocators(locators: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const locator of locators) {
    const value = locator?.trim();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

export function sortDocumentsByUploadedAt(rows: ProjectDocumentRow[]) {
  return [...rows].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
}

export function formatBytes(bytes: number | null | undefined): string {
  const value = typeof bytes === 'number' ? bytes : 0;
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let index = 0;
  let size = value;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  const rounded = size >= 10 || index === 0 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[index]}`;
}

export function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}

function getSourceLocatorExtension(doc: ProjectDocumentRow): string {
  return getExtension(doc.source_locator ?? '');
}

function getDocumentTitleExtension(doc: ProjectDocumentRow): string {
  return getExtension(doc.doc_title ?? '');
}

export function getDocumentDisplayName(doc: ProjectDocumentRow): string {
  const rawTitle = typeof doc.doc_title === 'string' ? doc.doc_title.trim() : '';
  const fallbackTitle = rawTitle || getFilenameFromLocator(doc.source_locator) || doc.source_uid;
  const titleExtension = getExtension(fallbackTitle);
  const locatorExtension = getSourceLocatorExtension(doc);
  const effectiveExtension = titleExtension || locatorExtension;

  if (!effectiveExtension || titleExtension) return fallbackTitle;
  return `${fallbackTitle}.${effectiveExtension}`;
}

export function isPdfDocument(doc: ProjectDocumentRow): boolean {
  if (doc.source_type.toLowerCase() === 'pdf') return true;
  if (getSourceLocatorExtension(doc) === 'pdf') return true;
  return getDocumentTitleExtension(doc) === 'pdf';
}

export function isImageDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (IMAGE_SOURCE_TYPES.has(sourceType)) return true;
  return IMAGE_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isTextDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (TEXT_SOURCE_TYPES.has(sourceType)) return true;
  if (sourceType.startsWith('text') || sourceType.includes('plain')) return true;
  return TEXT_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isJsonDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (sourceType === 'json' || sourceType === 'json_docling') return true;
  const ext = getExtension(doc.source_locator ?? '');
  return ext === 'json';
}

export function isMarkdownDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (sourceType === 'md' || sourceType === 'markdown' || sourceType === 'mdx') return true;
  const ext = getExtension(doc.source_locator ?? '');
  return ext === 'md' || ext === 'markdown' || ext === 'mdx';
}

export function isDocxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (DOCX_SOURCE_TYPES.has(sourceType)) return true;
  return DOCX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isPptxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (PPTX_SOURCE_TYPES.has(sourceType)) return true;
  return PPTX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isXlsxDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (XLSX_SOURCE_TYPES.has(sourceType)) return true;
  return XLSX_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isCodePreviewDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (CODE_PREVIEW_SOURCE_TYPES.has(sourceType)) return true;
  return CODE_PREVIEW_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

/** Returns the dot-prefixed extension for CodeMirror language lookup, e.g. '.py' */
export function getCodeFileExtension(doc: ProjectDocumentRow): string {
  const locatorExt = getSourceLocatorExtension(doc);
  if (locatorExt) return `.${locatorExt}`;
  const titleExt = getDocumentTitleExtension(doc);
  if (titleExt) return `.${titleExt}`;
  const sourceType = doc.source_type.toLowerCase();
  const typeToExt: Record<string, string> = {
    python: '.py', javascript: '.js', typescript: '.ts',
    rust: '.rs', csharp: '.cs', golang: '.go',
  };
  return typeToExt[sourceType] ?? `.${sourceType}`;
}

export function getDocumentFormat(doc: ProjectDocumentRow): string {
  const type = typeof doc.source_type === 'string' ? doc.source_type.trim().toLowerCase() : '';
  const locatorExtension = getExtension(doc.source_locator ?? '');
  const titleExtension = getExtension(doc.doc_title ?? '');
  const displayExtension = locatorExtension || titleExtension;

  if (type === 'binary' && displayExtension) return displayExtension.toUpperCase();
  if (type.length > 0) return type.toUpperCase();
  if (displayExtension) return displayExtension.toUpperCase();
  return '--';
}

