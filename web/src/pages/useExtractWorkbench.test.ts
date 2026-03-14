import { describe, expect, it } from 'vitest';

import { EXTRACT_DEFAULT_PANES, EXTRACT_TABS } from './useExtractWorkbench';

describe('extract workbench layout', () => {
  it('uses file list, config plus schema, and results plus downloads columns', () => {
    expect(EXTRACT_TABS.map((tab) => tab.label)).toEqual([
      'File List',
      'Extract Config',
      'Schema',
      'Results',
      'Downloads',
    ]);

    expect(EXTRACT_DEFAULT_PANES).toEqual([
      expect.objectContaining({
        tabs: ['extract-files'],
        activeTab: 'extract-files',
      }),
      expect.objectContaining({
        tabs: ['extract-config', 'extract-schema'],
        activeTab: 'extract-config',
      }),
      expect.objectContaining({
        tabs: ['extract-results', 'extract-downloads'],
        activeTab: 'extract-results',
      }),
    ]);
  });
});
