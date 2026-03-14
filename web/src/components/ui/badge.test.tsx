import { describe, expect, it } from 'vitest';

import { badgeVariants } from './badge';

describe('badgeVariants', () => {
  it('uses dark green badges with white text in light mode', () => {
    const classes = badgeVariants({ variant: 'green' });

    expect(classes).toContain('border-emerald-700');
    expect(classes).toContain('bg-emerald-700');
    expect(classes).toContain('text-white');
  });

  it('uses dark teal badges with white text in light mode', () => {
    const classes = badgeVariants({ variant: 'teal' });

    expect(classes).toContain('border-teal-700');
    expect(classes).toContain('bg-teal-700');
    expect(classes).toContain('text-white');
  });
});
