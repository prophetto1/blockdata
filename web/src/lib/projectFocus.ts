export const PROJECT_FOCUS_STORAGE_KEY = 'blockdata.shell.focused_project_id';

export const PROJECT_LIST_CHANGED_EVENT = 'project-list-changed';

export function readFocusedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === 'string' && parsed.trim().length > 0) {
      return parsed.trim();
    }
  } catch {
    // Fall through to plain value.
  }

  return trimmed.replace(/^"+|"+$/g, '') || null;
}

export function notifyProjectListChanged(focusProjectId?: string) {
  if (focusProjectId) {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, focusProjectId);
  }
  window.dispatchEvent(new CustomEvent(PROJECT_LIST_CHANGED_EVENT, {
    detail: { focusProjectId },
  }));
}
