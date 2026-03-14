import { describe, expect, it } from 'vitest';

import { getDrillConfig } from './nav-config';

describe('superuser document views nav', () => {
  it('registers the superuser drill', () => {
    expect(getDrillConfig('superuser')).toBeDefined();
  });

  it('puts Docling and Block Types in the second rail', () => {
    const superuser = getDrillConfig('superuser')!;
    const doclingSection = superuser.sections.find((section) => section.label === 'Docling');

    expect(doclingSection).toBeDefined();
    expect(doclingSection?.items.map((item) => item.label)).toEqual(['Docling', 'Block Types']);
    expect(doclingSection?.items.map((item) => item.path)).toEqual([
      '/app/superuser/parsers-docling',
      '/app/superuser/document-views',
    ]);
  });
});
