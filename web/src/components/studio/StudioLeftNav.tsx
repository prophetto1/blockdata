import { Link, useLocation } from 'react-router-dom';
import {
  IconCode,
  IconBrandPython,
  IconLayoutDashboard,
  IconTable,
  IconHistory,
  IconCalendarStats,
  IconChevronLeft,
  type Icon,
} from '@tabler/icons-react';
import { styleTokens } from '@/lib/styleTokens';

type StudioNavItem = {
  label: string;
  icon: Icon;
  color: string;
  path: string;
};

type StudioNavSection = {
  label: string;
  items: StudioNavItem[];
};

const NAV_SECTIONS: StudioNavSection[] = [
  {
    label: 'STUDIO',
    items: [
      { label: 'SQL',    icon: IconCode,              color: styleTokens.studio.colors.sql,    path: '/app/studio/sql' },
      { label: 'Python', icon: IconBrandPython,        color: styleTokens.studio.colors.python, path: '/app/studio/python' },
      { label: 'Visual', icon: IconLayoutDashboard,    color: styleTokens.studio.colors.visual, path: '/app/studio/visual' },
    ],
  },
  {
    label: 'DATA',
    items: [
      { label: 'Tables', icon: IconTable,              color: styleTokens.studio.colors.data,   path: '/app/studio/data' },
    ],
  },
  {
    label: 'HISTORY',
    items: [
      { label: 'Runs',   icon: IconHistory,            color: styleTokens.studio.colors.runs,   path: '/app/studio/runs' },
      { label: 'Jobs',   icon: IconCalendarStats,      color: styleTokens.studio.colors.jobs,   path: '/app/studio/jobs' },
    ],
  },
];

export function StudioLeftNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Studio navigation"
      style={{
        width: styleTokens.studio.navExpandedWidth,
        minWidth: styleTokens.studio.navExpandedWidth,
        backgroundColor: styleTokens.studio.surface,
        borderRight: `1px solid ${styleTokens.studio.border}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Back link — Evidence-style at top */}
      <div style={{ padding: '12px 8px 8px' }}>
        <Link
          to="/app/assets"
          aria-label="Back to app"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-white/6"
          style={{ color: 'var(--muted-foreground)', textDecoration: 'none' }}
        >
          <IconChevronLeft size={14} stroke={2} />
          <span className="text-xs font-medium">Back to App</span>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: styleTokens.studio.border, margin: '0 8px 8px' }} />

      {/* Nav sections */}
      <div className="flex flex-1 flex-col gap-4 px-2 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p
              className="mb-1 px-2 text-[10px] font-mono tracking-widest"
              style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}
            >
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
                  className="flex items-center gap-2.5 rounded-md py-1.5 text-sm transition-colors"
                  style={{
                    textDecoration: 'none',
                    borderLeft: isActive ? `2px solid ${item.color}` : '2px solid transparent',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : undefined,
                    color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)',
                    paddingLeft: isActive ? 6 : 8,
                    paddingRight: 8,
                  }}
                >
                  <item.icon
                    size={15}
                    stroke={isActive ? 2 : 1.75}
                    style={{ color: isActive ? item.color : 'var(--muted-foreground)', flexShrink: 0 }}
                  />
                  <span className="text-[13px]">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
