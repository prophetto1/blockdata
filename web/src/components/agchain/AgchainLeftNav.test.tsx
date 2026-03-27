import { describe, expect, it } from 'vitest';
import { AGCHAIN_NAV_SECTIONS } from './AgchainLeftNav';

describe('AGCHAIN_NAV_SECTIONS', () => {
  it('defines the 5 platform-level nav items', () => {
    expect(AGCHAIN_NAV_SECTIONS).toEqual([
      {
        label: '',
        items: [
          expect.objectContaining({ label: 'Benchmarks',    path: '/app/agchain/benchmarks', drillId: 'benchmark' }),
          expect.objectContaining({ label: 'Models',        path: '/app/agchain/models' }),
          expect.objectContaining({ label: 'Runs',          path: '/app/agchain/runs' }),
          expect.objectContaining({ label: 'Results',       path: '/app/agchain/results' }),
          expect.objectContaining({ label: 'Observability', path: '/app/agchain/observability' }),
        ],
      },
    ]);
  });
});
