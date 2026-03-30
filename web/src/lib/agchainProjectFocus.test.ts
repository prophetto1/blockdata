import { describe, expect, it, vi } from 'vitest';
import {
  AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT,
  AGCHAIN_PROJECT_FOCUS_STORAGE_KEY,
  AGCHAIN_PROJECT_LIST_CHANGED_EVENT,
  broadcastAgchainProjectListChanged,
  readStoredAgchainProjectFocusSlug,
  setStoredAgchainProjectFocusSlug,
} from './agchainProjectFocus';

describe('agchainProjectFocus', () => {
  it('persists focus changes and broadcasts the focused slug event', () => {
    const handler = vi.fn();
    window.addEventListener(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, handler);

    setStoredAgchainProjectFocusSlug('finance-eval');

    expect(readStoredAgchainProjectFocusSlug()).toBe('finance-eval');
    expect(window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY)).toBe('finance-eval');
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, handler);
  });

  it('broadcasts project-list invalidation with the newly focused slug', () => {
    const handler = vi.fn();
    window.addEventListener(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, handler);

    broadcastAgchainProjectListChanged('legal-10');

    expect(window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY)).toBe('legal-10');
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, handler);
  });
});
