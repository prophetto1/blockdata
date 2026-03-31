import { platformApiFetch } from '@/lib/platformApi';

export const DOCUMENT_VIEW_MODE_POLICY_KEY = 'platform.docling_blocks_mode';
export type DocumentViewMode = 'raw_docling';

export const DEFAULT_DOCUMENT_VIEW_MODE: DocumentViewMode = 'raw_docling';

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
  return value === 'raw_docling' ? value : DEFAULT_DOCUMENT_VIEW_MODE;
}

export function getDocumentViewModeValue(payload: DocumentViewPayload | null | undefined): DocumentViewMode {
  const platformValue = payload?.platform?.docling_blocks_mode;
  if (platformValue !== undefined) return normalizeDocumentViewMode(platformValue);
  const row = payload?.policies?.find((policy) => policy.policy_key === DOCUMENT_VIEW_MODE_POLICY_KEY);
  return normalizeDocumentViewMode(row?.value);
}

export async function loadDocumentViewMode(): Promise<DocumentViewMode> {
  try {
    const resp = await platformApiFetch('/admin/config/docling');
    const text = await resp.text();
    if (!resp.ok) return DEFAULT_DOCUMENT_VIEW_MODE;

    const data = text ? JSON.parse(text) as { docling_blocks_mode?: unknown } : {};
    return normalizeDocumentViewMode(data.docling_blocks_mode);
  } catch {
    return DEFAULT_DOCUMENT_VIEW_MODE;
  }
}
