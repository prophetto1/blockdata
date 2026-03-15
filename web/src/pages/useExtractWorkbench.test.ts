import { describe, expect, it } from 'vitest';

import {
  EXTRACT_DEFAULT_PANES,
  EXTRACT_SCHEMA_START_ACTIONS,
  EXTRACT_SCHEMA_START_DESCRIPTION,
  EXTRACT_SCHEMA_START_TITLE,
  EXTRACT_TABS,
  getExtractFileListExtraColumns,
} from './useExtractWorkbench';

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

  it('adds a placeholder schema column to the extract file list', () => {
    expect(getExtractFileListExtraColumns().map((column) => column.header)).toEqual(['Schema']);
  });

  it('defines the schema start state copy before editing begins', () => {
    expect(EXTRACT_SCHEMA_START_TITLE).toBe('Create Schema');
    expect(EXTRACT_SCHEMA_START_DESCRIPTION).toBe('Start manually or bootstrap with a generated example.');
    expect(EXTRACT_SCHEMA_START_ACTIONS).toEqual(['Auto-Generate', 'Create Manually']);
  });
});
