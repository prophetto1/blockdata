import { describe, expect, it } from 'vitest';
import { AGCHAIN_NAV_SECTIONS } from './AgchainLeftNav';

describe('AGCHAIN_NAV_SECTIONS', () => {
  it('defines the locked 9-item overview-first AGChain rail in order', () => {
    expect(AGCHAIN_NAV_SECTIONS).toHaveLength(1);
    expect(AGCHAIN_NAV_SECTIONS[0]?.items.map((item) => item.label)).toEqual([
      'Overview',
      'Datasets',
      'Prompts',
      'Scorers',
      'AI Providers',
      'Parameters',
      'Tools',
      'Observability',
      'Settings',
    ]);

    expect(AGCHAIN_NAV_SECTIONS[0]?.items.map((item) => item.path)).toEqual([
      '/app/agchain/overview',
      '/app/agchain/datasets',
      '/app/agchain/prompts',
      '/app/agchain/scorers',
      '/app/agchain/ai-providers',
      '/app/agchain/parameters',
      '/app/agchain/tools',
      '/app/agchain/observability',
      '/app/agchain/settings',
    ]);
  });
});
