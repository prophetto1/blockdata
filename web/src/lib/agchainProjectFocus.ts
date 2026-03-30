export const AGCHAIN_PROJECT_FOCUS_STORAGE_KEY = 'agchain.projectFocusSlug';
export const AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT = 'agchain:project-focus-changed';
export const AGCHAIN_PROJECT_LIST_CHANGED_EVENT = 'agchain:project-list-changed';

function canUseWindow() {
  return typeof window !== 'undefined';
}

export function readStoredAgchainProjectFocusSlug(): string | null {
  if (!canUseWindow()) {
    return null;
  }

  return window.localStorage.getItem(AGCHAIN_PROJECT_FOCUS_STORAGE_KEY);
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

export function broadcastAgchainProjectFocusChanged(slug: string | null) {
  if (!canUseWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent(AGCHAIN_PROJECT_FOCUS_CHANGED_EVENT, {
    detail: { focusedProjectSlug: slug },
  }));
}

export function setStoredAgchainProjectFocusSlug(slug: string | null) {
  writeStoredAgchainProjectFocusSlug(slug);
  broadcastAgchainProjectFocusChanged(slug);
}

export function broadcastAgchainProjectListChanged(focusedProjectSlug?: string | null) {
  if (!canUseWindow()) {
    return;
  }

  if (focusedProjectSlug !== undefined) {
    writeStoredAgchainProjectFocusSlug(focusedProjectSlug);
  }

  window.dispatchEvent(new CustomEvent(AGCHAIN_PROJECT_LIST_CHANGED_EVENT, {
    detail: { focusedProjectSlug: focusedProjectSlug ?? null },
  }));
}
