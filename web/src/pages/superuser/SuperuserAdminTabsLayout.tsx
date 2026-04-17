import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

type AdminTabValue = 'superuser' | 'bd' | 'ac';

const ADMIN_TAB_DEFS: Array<{
  value: AdminTabValue;
  label: 'Superuser' | 'BD' | 'AC';
  path: string;
}> = [
  { value: 'superuser', label: 'Superuser', path: '/app/superuser' },
  { value: 'bd', label: 'BD', path: '/app/superuser/bd' },
  { value: 'ac', label: 'AC', path: '/app/superuser/ac' },
];

function getCurrentTab(pathname: string): AdminTabValue {
  if (pathname.startsWith('/app/superuser/bd')) return 'bd';
  if (pathname.startsWith('/app/superuser/ac')) return 'ac';
  return 'superuser';
}

export function SuperuserAdminTabsLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { access, status } = useAdminSurfaceAccessState();

  const currentTab = getCurrentTab(pathname);
  const resolved = access ?? {
    blockdataAdmin: false,
    agchainAdmin: false,
    superuser: false,
  };

  const tabEnabled = {
    superuser: status !== 'ready' || resolved.superuser,
    bd: status !== 'ready' || resolved.blockdataAdmin || resolved.superuser,
    ac: status !== 'ready' || resolved.agchainAdmin || resolved.superuser,
  } satisfies Record<AdminTabValue, boolean>;

  return (
    <Tabs
      value={currentTab}
      onValueChange={(value) => {
        const next = ADMIN_TAB_DEFS.find((tab) => tab.value === value);
        if (next && next.path !== pathname) {
          navigate(next.path);
        }
      }}
    >
      <TabsList className="grid w-[320px] grid-cols-3 rounded-lg border border-border bg-card/70 p-1">
        {ADMIN_TAB_DEFS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={!tabEnabled[tab.value]}
            className="h-9 w-full"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
