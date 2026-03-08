import { describe, expect, it } from 'vitest';

import { PROJECT_FOCUS_STORAGE_KEY, readFocusedProjectId } from '@/lib/projectFocus';

describe('readFocusedProjectId', () => {
  it('reads a plain stored project id', () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'project-123');

    expect(readFocusedProjectId()).toBe('project-123');
  });

  it('reads a JSON-encoded stored project id', () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, JSON.stringify('project-456'));

    expect(readFocusedProjectId()).toBe('project-456');
  });
});
