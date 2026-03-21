import {
  IconArrowsShuffle,
  IconChartBar,
  IconClipboardList,
  IconClock,
  IconEdit,
  IconFileText,
  IconGitBranch,
  IconLayoutDashboard,
  IconLock,
  IconPlayerPlay,
  IconTopologyRing3,
  type Icon,
} from '@tabler/icons-react';

export type FlowsShellNavItem = {
  label: string;
  icon: Icon;
  tab: string;
};

export const FLOWS_SHELL_ITEMS: FlowsShellNavItem[] = [
  { label: 'Overview', icon: IconLayoutDashboard, tab: 'overview' },
  { label: 'Topology', icon: IconTopologyRing3, tab: 'topology' },
  { label: 'Executions', icon: IconPlayerPlay, tab: 'executions' },
  { label: 'Edit', icon: IconEdit, tab: 'edit' },
  { label: 'Revisions', icon: IconGitBranch, tab: 'revisions' },
  { label: 'Triggers', icon: IconClock, tab: 'triggers' },
  { label: 'Logs', icon: IconFileText, tab: 'logs' },
  { label: 'Metrics', icon: IconChartBar, tab: 'metrics' },
  { label: 'Dependencies', icon: IconArrowsShuffle, tab: 'dependencies' },
  { label: 'Concurrency', icon: IconLock, tab: 'concurrency' },
  { label: 'Audit Logs', icon: IconClipboardList, tab: 'auditlogs' },
];
