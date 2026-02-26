import { Navigate } from 'react-router-dom';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';

const FLOW_DEFAULT_TAB_STORAGE_KEY = 'flowDefaultTab';
const FLOW_TAB_VALUES = new Set([
  'overview',
  'topology',
  'executions',
  'edit',
  'revisions',
  'triggers',
  'logs',
  'metrics',
  'dependencies',
  'concurrency',
  'auditlogs',
]);

function readFocusedProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROJECT_FOCUS_STORAGE_KEY);
  const value = raw?.trim() ?? '';
  return value.length > 0 ? value : null;
}

function readDefaultFlowTab(): string {
  if (typeof window === 'undefined') return 'overview';
  const raw = window.localStorage.getItem(FLOW_DEFAULT_TAB_STORAGE_KEY);
  const value = raw?.trim() ?? '';
  if (!FLOW_TAB_VALUES.has(value)) return 'overview';
  return value;
}

export default function FlowsIndexRedirect() {
  const focusedProjectId = readFocusedProjectId();
  const defaultTab = readDefaultFlowTab();

  if (!focusedProjectId) {
    return <Navigate to="/app/projects" replace />;
  }

  return <Navigate to={`/app/flows/${focusedProjectId}/${defaultTab}`} replace />;
}
