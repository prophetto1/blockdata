import { describe, expect, it } from 'vitest';

import { PARSE_TABS, PARSE_DEFAULT_PANES } from './useParseWorkbench';

describe('unified parse layout', () => {
  it('has unified tab IDs covering both tracks', () => {
    const ids = PARSE_TABS.map((tab) => tab.id);
    expect(ids).toContain('parse-compact');
    expect(ids).toContain('config');
    expect(ids).toContain('preview-main');
    expect(ids).toContain('preview-detail');
    expect(ids).toContain('preview-downloads');
  });

  it('has three default panes', () => {
    expect(PARSE_DEFAULT_PANES).toHaveLength(3);
  });
});
