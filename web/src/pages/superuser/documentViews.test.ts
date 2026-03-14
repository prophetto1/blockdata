import { describe, expect, it } from 'vitest';

import { getDocumentViewModeValue, normalizeDocumentViewMode } from './documentViews';

describe('document view mode helpers', () => {
  it('defaults to normalized when missing or invalid', () => {
    expect(normalizeDocumentViewMode(undefined)).toBe('normalized');
    expect(normalizeDocumentViewMode('weird')).toBe('normalized');
  });

  it('accepts raw_docling explicitly', () => {
    expect(normalizeDocumentViewMode('raw_docling')).toBe('raw_docling');
  });

  it('reads the policy row from admin-config payloads', () => {
    expect(getDocumentViewModeValue({
      policies: [
        { policy_key: 'platform.docling_blocks_mode', value: 'raw_docling' },
      ],
    })).toBe('raw_docling');
    expect(getDocumentViewModeValue({
      policies: [
        { policy_key: 'platform.docling_blocks_mode', value: 'normalized' },
      ],
    })).toBe('normalized');
  });
});
