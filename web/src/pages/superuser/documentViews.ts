import { edgeFetch } from '@/lib/edge';

export const DOCUMENT_VIEW_MODE_POLICY_KEY = 'platform.docling_blocks_mode';
export const DEFAULT_DOCUMENT_VIEW_MODE = 'raw_docling';

export type DocumentViewMode = 'normalized' | 'raw_docling';

type PolicyLike = {
  policy_key: string;
  value: unknown;
};

type DocumentViewPayload = {
  platform?: {
    docling_blocks_mode?: unknown;
  };
  policies?: PolicyLike[];
};

export function normalizeDocumentViewMode(value: unknown): DocumentViewMode {
  return value === 'normalized' || value === 'raw_docling' ? 'raw_docling' : DEFAULT_DOCUMENT_VIEW_MODE;
}

export function getDocumentViewModeValue(payload: DocumentViewPayload | null | undefined): DocumentViewMode {
  const platformValue = payload?.platform?.docling_blocks_mode;
  if (platformValue !== undefined) return normalizeDocumentViewMode(platformValue);
  const row = payload?.policies?.find((policy) => policy.policy_key === DOCUMENT_VIEW_MODE_POLICY_KEY);
  return normalizeDocumentViewMode(row?.value);
}

export async function loadDocumentViewMode(): Promise<DocumentViewMode> {
  try {
    const resp = await edgeFetch('upload-policy', { method: 'GET' });
    const text = await resp.text();
    if (!resp.ok) return DEFAULT_DOCUMENT_VIEW_MODE;

    const payload = text ? JSON.parse(text) as DocumentViewPayload : {};
    return getDocumentViewModeValue(payload);
  } catch {
    return DEFAULT_DOCUMENT_VIEW_MODE;
  }
}
