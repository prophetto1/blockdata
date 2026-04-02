export const AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY = 'agchain.organizationFocusId';
export const AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY = 'agchain.projectFocusId';
export const AGCHAIN_PROJECT_FOCUS_STORAGE_KEY = 'agchain.projectFocusSlug';

export type AgchainProjectFocusDetail = {
  focusedOrganizationId?: string | null;
  focusedProjectId?: string | null;
  focusedProjectSlug?: string | null;
};

function canUseWindow() {
  return typeof window !== 'undefined';
}

export function readStoredAgchainProjectFocusSlug(): string | null {
  if (!canUseWindow()) {
    return null;
  }

  return window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY);
}

export function readStoredAgchainOrganizationFocusId(): string | null {
  if (!canUseWindow()) {
    return null;
  }

  return window.localStorage.getItem(AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY);
}

export function readStoredAgchainProjectFocusId(): string | null {
  if (!canUseWindow()) {
    return null;
  }

  return window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY);
}

export function writeStoredAgchainProjectFocusSlug(slug: string | null) {
  if (!canUseWindow()) {
    return;
  }

  if (slug) {
    window.localStorage.setItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY, slug);
    return;
  }

  window.localStorage.removeItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY);
}

export function writeStoredAgchainWorkspaceFocus(detail: AgchainProjectFocusDetail) {
  if (!canUseWindow()) {
    return;
  }

  if (detail.focusedOrganizationId) {
    window.localStorage.setItem(AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY, detail.focusedOrganizationId);
  } else if (detail.focusedOrganizationId === null) {
    window.localStorage.removeItem(AGCHAIN_ORGANIZATION_FOCUS_STORAGE_KEY);
  }

  if (detail.focusedProjectId) {
    window.localStorage.setItem(AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY, detail.focusedProjectId);
  } else if (detail.focusedProjectId === null) {
    window.localStorage.removeItem(AGCHAIN_PROJECT_FOCUS_ID_STORAGE_KEY);
  }

  if (detail.focusedProjectSlug !== undefined) {
    writeStoredAgchainProjectFocusSlug(detail.focusedProjectSlug ?? null);
  }
}

