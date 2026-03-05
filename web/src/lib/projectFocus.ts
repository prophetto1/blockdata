export const PROJECT_FOCUS_STORAGE_KEY = 'blockdata.shell.focused_project_id';

export const PROJECT_LIST_CHANGED_EVENT = 'project-list-changed';

export function notifyProjectListChanged(focusProjectId?: string) {
  if (focusProjectId) {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, focusProjectId);
  }
  window.dispatchEvent(new CustomEvent(PROJECT_LIST_CHANGED_EVENT, {
    detail: { focusProjectId },
  }));
}
