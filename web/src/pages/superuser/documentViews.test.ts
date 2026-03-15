import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DOCUMENT_VIEW_MODE,
  getDocumentViewModeValue,
  normalizeDocumentViewMode,
} from './documentViews';

describe('document view mode helpers', () => {
  it('defaults to raw_docling when missing or invalid', () => {
    expect(DEFAULT_DOCUMENT_VIEW_MODE).toBe('raw_docling');
    expect(normalizeDocumentViewMode(undefined)).toBe('raw_docling');
    expect(normalizeDocumentViewMode('weird')).toBe('raw_docling');
  });

  it('collapses normalized to raw_docling', () => {
    expect(normalizeDocumentViewMode('raw_docling')).toBe('raw_docling');
    expect(normalizeDocumentViewMode('normalized')).toBe('raw_docling');
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
    })).toBe('raw_docling');
  });
});
