import { describe, expect, it } from 'vitest';
import { PARSE_DEFAULT_PANES, PARSE_TABS } from './useParseWorkbench';

describe('Parse workbench tabs', () => {
  it('includes temporary comparison tabs for alternate file-list designs', () => {
    expect(PARSE_TABS.map((tab) => tab.id)).toEqual(
      expect.arrayContaining(['parse', 'parse-navigator', 'parse-compact']),
    );
  });

  it('keeps the three file-list tabs together in the left pane', () => {
    expect(PARSE_DEFAULT_PANES[0]?.tabs).toEqual(['parse', 'parse-navigator', 'parse-compact']);
    expect(PARSE_DEFAULT_PANES[0]?.activeTab).toBe('parse');
  });
});
