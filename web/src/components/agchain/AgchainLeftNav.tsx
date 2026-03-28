import {
  IconActivity,
  IconAtom2,
  IconChartBar,
  IconFlask2,
  IconPackages,
} from '@tabler/icons-react';
import type { AdminNavSection } from '@/components/admin/AdminLeftNav';

export const AGCHAIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: '',
    items: [
      { label: 'Benchmarks',    icon: IconPackages, path: '/app/agchain/benchmarks' },
      { label: 'Models',        icon: IconAtom2,    path: '/app/agchain/models' },
      { label: 'Runs',          icon: IconFlask2,   path: '/app/agchain/runs' },
      { label: 'Results',       icon: IconChartBar, path: '/app/agchain/results' },
      { label: 'Observability', icon: IconActivity, path: '/app/agchain/observability' },
    ],
  },
];
