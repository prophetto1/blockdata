import { Link, useLocation } from 'react-router-dom';
import {
  IconServer,
  IconSettings,
  IconClipboardList,
  IconCode,
  IconTestPipe,
  IconFileText,
  IconChevronLeft,
  IconCamera,
  type Icon,
} from '@tabler/icons-react';

type AdminNavItem = {
  label: string;
  icon: Icon;
  path: string;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

const NAV_SECTIONS: AdminNavSection[] = [
  {
    label: 'CONFIG',
    items: [
      { label: 'Instance', icon: IconServer, path: '/app/superuser/instance-config' },
      { label: 'Workers', icon: IconServer, path: '/app/superuser/worker-config' },
      { label: 'Docling', icon: IconSettings, path: '/app/superuser/parsers-docling' },
    ],
  },
  {
    label: 'DATA',
    items: [
      { label: 'Document Views', icon: IconFileText, path: '/app/superuser/document-views' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Audit History', icon: IconClipboardList, path: '/app/superuser/audit' },
      { label: 'API Endpoints', icon: IconCode, path: '/app/superuser/api-endpoints' },
      { label: 'Test Integrations', icon: IconTestPipe, path: '/app/superuser/test-integrations' },
    ],
  },
  {
    label: 'DESIGN',
    items: [
      { label: 'Layout Captures', icon: IconCamera, path: '/app/superuser/design-layout-captures' },
    ],
  },
];

export function AdminLeftNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Admin navigation"
      data-testid="admin-secondary-rail"
      className="flex h-full w-[184px] min-w-[184px] flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-border px-2 py-3"
      style={{ backgroundColor: 'var(--sidebar-accent)' }}
    >
      <div className="px-2 pb-3">
        <Link
          to="/app/assets"
          aria-label="Back to app"
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/75 transition-colors hover:bg-background/70 hover:text-sidebar-accent-foreground"
        >
          <IconChevronLeft size={14} stroke={2} />
          <span>Back to App</span>
        </Link>
      </div>

      <div className="mx-2 mb-3 h-px bg-sidebar-border" />

      <div className="flex flex-1 flex-col gap-4 px-1 pb-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors',
                    isActive
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-sidebar-foreground/72 hover:bg-background/60 hover:text-foreground',
                  ].join(' ')}
                >
                  <item.icon size={15} stroke={isActive ? 2 : 1.75} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
