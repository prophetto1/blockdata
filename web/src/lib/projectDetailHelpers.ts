import { supabase } from '@/lib/supabase';
import type { DocumentRow } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectDocumentRow = DocumentRow & {
  source_locator?: string | null;
  conv_locator?: string | null;
};

export type PreviewKind = 'none' | 'pdf' | 'image' | 'text' | 'docx' | 'pptx' | 'file';

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
  const knownSuffixes = ['.docling.json', '.pandoc.ast.json', '.citations.json', '.doctags', '.md', '.html'];
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

function getExtension(name: string): string {
  const index = name.lastIndexOf('.');
  if (index < 0 || index === name.length - 1) return '';
  return name.slice(index + 1).toLowerCase();
}

function getSourceLocatorExtension(doc: ProjectDocumentRow): string {
  return getExtension(doc.source_locator ?? '');
}

export function isPdfDocument(doc: ProjectDocumentRow): boolean {
  if (doc.source_type.toLowerCase() === 'pdf') return true;
  return getSourceLocatorExtension(doc) === 'pdf';
}

export function isImageDocument(doc: ProjectDocumentRow): boolean {
  const sourceType = doc.source_type.toLowerCase();
  if (IMAGE_SOURCE_TYPES.has(sourceType)) return true;
  return IMAGE_EXTENSIONS.has(getSourceLocatorExtension(doc));
}

export function isTextDocument(doc: ProjectDocumentRow): boolean {
  return TEXT_SOURCE_TYPES.has(doc.source_type.toLowerCase());
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

export function getDocumentFormat(doc: ProjectDocumentRow): string {
  const type = typeof doc.source_type === 'string' ? doc.source_type.trim() : '';
  if (type.length > 0) return type.toUpperCase();
  const extension = getExtension(doc.source_locator ?? '');
  if (extension) return extension.toUpperCase();
  return '--';
}
