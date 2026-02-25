import { Navigate } from 'react-router-dom';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';

function readFocusedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
  const value = raw?.trim() ?? '';
  return value.length > 0 ? value : null;
}

export default function FlowsIndexRedirect() {
  const focusedProjectId = readFocusedProjectId();

  if (!focusedProjectId) {
    return <Navigate to="/app/projects" replace />;
  }

  return <Navigate to={`/app/flows/${focusedProjectId}/overview`} replace />;
}
