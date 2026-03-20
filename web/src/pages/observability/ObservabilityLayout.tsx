import { Link, Outlet, useLocation } from 'react-router-dom';

import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

const tabs = [
  { label: 'Telemetry', path: '/app/observability/telemetry' },
  { label: 'Traces', path: '/app/observability/traces' },
  { label: 'Logs', path: '/app/observability/logs' },
];

export default function ObservabilityLayout() {
  useShellHeaderTitle({ title: 'Observability', breadcrumbs: ['Observability'] });
  const location = useLocation();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`rounded-md px-3 py-1.5 text-sm ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <Outlet />
      </div>
    </div>
  );
}
