import { edgeFetch } from '@/lib/edge';

export const DOCUMENT_VIEW_MODE_POLICY_KEY = 'platform.docling_blocks_mode';

export type DocumentViewMode = 'normalized' | 'raw_docling';

type PolicyLike = {
  policy_key: string;
  value: unknown;
};

export function normalizeDocumentViewMode(value: unknown): DocumentViewMode {
  return value === 'raw_docling' ? 'raw_docling' : 'normalized';
}

export function getDocumentViewModeValue(payload: { policies?: PolicyLike[] } | null | undefined): DocumentViewMode {
  const row = payload?.policies?.find((policy) => policy.policy_key === DOCUMENT_VIEW_MODE_POLICY_KEY);
  return normalizeDocumentViewMode(row?.value);
}

export async function loadDocumentViewMode(): Promise<DocumentViewMode> {
  try {
    const resp = await edgeFetch('admin-config?audit_limit=0', { method: 'GET' });
    const text = await resp.text();
    if (!resp.ok) return 'normalized';

    const payload = text ? JSON.parse(text) as { policies?: PolicyLike[] } : {};
    return getDocumentViewModeValue(payload);
  } catch {
    return 'normalized';
  }
}
