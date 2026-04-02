import { afterEach, describe, expect, it } from 'vitest';
import {
  AGCHAIN_PROJECT_FOCUS_STORAGE_KEY,
  AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY,
  AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY,
  readStoredAgchainProjectFocusSlug,
  readStoredAgchainProjectFocusId,
  readStoredAgchainOrganizationFocusId,
  writeStoredAgchainWorkspaceFocus,
} from './agchainProjectFocus';

afterEach(() => {
  window.localStorage.clear();
});

describe('agchainProjectFocus localStorage utilities', () => {
  it('writes and reads project focus slug', () => {
    writeStoredAgchainWorkspaceFocus({ focusedProjectSlug: 'finance-eval' });
    expect(readStoredAgchainProjectFocusSlug()).toBe('finance-eval');
    expect(window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY)).toBe('finance-eval');
  });

  it('writes and reads project focus id', () => {
    writeStoredAgchainWorkspaceFocus({ focusedProjectId: 'project-1' });
    expect(readStoredAgchainProjectFocusId()).toBe('project-1');
    expect(window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY)).toBe('project-1');
  });

  it('writes and reads organization focus id', () => {
    writeStoredAgchainWorkspaceFocus({ focusedOrganizationId: 'org-1' });
    expect(readStoredAgchainOrganizationFocusId()).toBe('org-1');
    expect(window.localStorage.getItem(AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY)).toBe('org-1');
  });

  it('clears values when set to null', () => {
    writeStoredAgchainWorkspaceFocus({
      focusedOrganizationId: 'org-1',
      focusedProjectId: 'project-1',
      focusedProjectSlug: 'finance-eval',
    });
    writeStoredAgchainWorkspaceFocus({
      focusedOrganizationId: null,
      focusedProjectId: null,
      focusedProjectSlug: null,
    });
    expect(readStoredAgchainOrganizationFocusId()).toBeNull();
    expect(readStoredAgchainProjectFocusId()).toBeNull();
    expect(readStoredAgchainProjectFocusSlug()).toBeNull();
  });

  it('does not overwrite values when fields are undefined', () => {
    writeStoredAgchainWorkspaceFocus({
      focusedOrganizationId: 'org-1',
      focusedProjectId: 'project-1',
      focusedProjectSlug: 'slug-1',
    });
    writeStoredAgchainWorkspaceFocus({ focusedProjectSlug: 'slug-2' });
    expect(readStoredAgchainOrganizationFocusId()).toBe('org-1');
    expect(readStoredAgchainProjectFocusId()).toBe('project-1');
    expect(readStoredAgchainProjectFocusSlug()).toBe('slug-2');
  });
});
