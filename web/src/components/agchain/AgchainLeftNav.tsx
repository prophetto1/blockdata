import {
  IconActivity,
  IconChartBar,
  IconClipboardList,
  IconCode,
  IconCpu,
  IconDatabase,
  IconFileText,
  IconGitBranch,
  IconLayoutDashboard,
  IconLayoutGrid,
  IconPlugConnected,
  IconSettings,
  IconTestPipe,
  IconWand,
} from '@tabler/icons-react';
import type { AdminNavSection } from '@/components/admin/AdminLeftNav';

export function buildAgchainNavSections(): AdminNavSection[] {
  return [
    {
      label: '',
      items: [
        { label: 'Overview',         icon: IconLayoutDashboard, path: '/app/agchain/overview' },
        { label: 'Playground',       icon: IconLayoutGrid,      path: '/app/agchain/playground' },
        { label: 'Sandbox',          icon: IconTestPipe,        path: '/app/agchain/sandbox' },
        { label: 'Eval Designer',    icon: IconGitBranch,       path: '/app/agchain/eval-designer' },
        { label: 'Harness Designer', icon: IconGitBranch,       path: '/app/agchain/harness-designer' },
      ],
    },
    {
      label: 'Eval',
      items: [
        { label: 'Datasets', icon: IconDatabase,      path: '/app/agchain/eval/datasets' },
        { label: 'Tasks',    icon: IconClipboardList, path: '/app/agchain/eval/tasks' },
        { label: 'Scorers',  icon: IconChartBar,      path: '/app/agchain/eval/scorers' },
        { label: 'Models',   icon: IconWand,          path: '/app/agchain/eval/models' },
        { label: 'Runs',     icon: IconActivity,      path: '/app/agchain/eval/runs' },
      ],
    },
    {
      label: 'Monitor',
      items: [
        { label: 'Metrics', icon: IconChartBar, path: '/app/agchain/monitor/metrics' },
        { label: 'Logs',    icon: IconFileText, path: '/app/agchain/monitor/logs' },
        { label: 'Trace',   icon: IconActivity, path: '/app/agchain/monitor/trace' },
      ],
    },
    {
      label: 'Harness',
      items: [
        { label: 'Prompts',      icon: IconFileText,      path: '/app/agchain/harness/prompts' },
        { label: 'Instructions', icon: IconClipboardList, path: '/app/agchain/harness/instructions' },
        { label: 'Skills',       icon: IconWand,          path: '/app/agchain/harness/skills' },
        { label: 'MCP',          icon: IconPlugConnected, path: '/app/agchain/harness/mcp' },
        { label: 'Storage',      icon: IconDatabase,      path: '/app/agchain/harness/storage' },
        { label: 'Memory',       icon: IconCpu,           path: '/app/agchain/harness/memory' },
        { label: 'Hooks',        icon: IconCode,          path: '/app/agchain/harness/hooks' },
      ],
    },
    {
      label: 'Settings',
      items: [
        { label: 'Settings', icon: IconSettings, path: '/app/agchain/settings' },
      ],
    },
  ];
}

export const AGCHAIN_NAV_SECTIONS: AdminNavSection[] = buildAgchainNavSections();
