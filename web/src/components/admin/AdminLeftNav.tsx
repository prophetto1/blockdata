import { Link, useLocation } from 'react-router-dom';
import {
  IconServer,
  IconSettings,
  IconClipboardList,
  IconCode,
  IconTestPipe,
  IconFileText,
  IconChevronLeft,
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
];

export function AdminLeftNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Admin navigation"
      className="flex h-full w-[200px] min-w-[200px] flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-card"
    >
      {/* Back link */}
      <div className="p-3 pb-2">
        <Link
          to="/app/assets"
          aria-label="Back to app"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <IconChevronLeft size={14} stroke={2} />
          <span className="text-xs font-medium">Back to App</span>
        </Link>
      </div>

      <div className="mx-3 mb-2 h-px bg-border" />

      {/* Nav sections */}
      <div className="flex flex-1 flex-col gap-4 px-2 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-1 px-2 text-[10px] font-mono tracking-widest text-muted-foreground/40">
              {section.label}
            </p>
            {section.items.map((item) => {
              const isActive =
                pathname === item.path || pathname.startsWith(item.path + '/');

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  ].join(' ')}
                >
                  <item.icon size={15} stroke={isActive ? 2 : 1.75} className="shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
