import { describe, expect, it } from 'vitest';

import { toSelectItemOptions } from './setting-card-shared';

describe('toSelectItemOptions', () => {
  it('keeps string options as matching labels and values', () => {
    expect(toSelectItemOptions(['normalized'])).toEqual([
      { label: 'normalized', value: 'normalized' },
    ]);
  });

  it('preserves explicit labels for stored values', () => {
    expect(toSelectItemOptions([
      { label: 'Normalized', value: 'normalized' },
      { label: 'Raw Docling', value: 'raw_docling' },
    ])).toEqual([
      { label: 'Normalized', value: 'normalized' },
      { label: 'Raw Docling', value: 'raw_docling' },
    ]);
  });
});
