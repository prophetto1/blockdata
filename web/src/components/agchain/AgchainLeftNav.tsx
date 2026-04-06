import {
  IconActivity,
  IconAdjustments,
  IconChartBar,
  IconCpu,
  IconDatabase,
  IconFileText,
  IconKey,
  IconLayoutDashboard,
  IconSettings,
} from '@tabler/icons-react';
import type { AdminNavSection } from '@/components/admin/AdminLeftNav';

export const AGCHAIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: '',
    items: [
      { label: 'Overview',      icon: IconLayoutDashboard, path: '/app/agchain/overview' },
      { label: 'Datasets',      icon: IconDatabase,        path: '/app/agchain/datasets' },
      { label: 'Prompts',       icon: IconFileText,        path: '/app/agchain/prompts' },
      { label: 'Scorers',       icon: IconChartBar,        path: '/app/agchain/scorers' },
      { label: 'AI Providers',  icon: IconKey,             path: '/app/agchain/ai-providers' },
      { label: 'Parameters',    icon: IconAdjustments,     path: '/app/agchain/parameters' },
      { label: 'Tools',         icon: IconCpu,             path: '/app/agchain/tools' },
      { label: 'Observability', icon: IconActivity,        path: '/app/agchain/observability' },
      { label: 'Settings',      icon: IconSettings,        path: '/app/agchain/settings' },
    ],
  },
];
