import { useMemo, useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconApi,
  IconBuilding,
  IconCreditCard,
  IconKey,
  IconLock,
  IconSettings,
  IconShield,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AgchainSettingsSearch } from './AgchainSettingsSearch';

export type AgchainSettingsNavItem = {
  id: string;
  label: string;
  path: string;
  icon: Icon;
  limited?: boolean;
};

export type AgchainSettingsNavGroup = {
  id: string;
  label: string;
  items: AgchainSettingsNavItem[];
};

const AGCHAIN_SETTINGS_NAV: AgchainSettingsNavGroup[] = [
  {
    id: 'organization',
    label: 'Organization',
    items: [
      { id: 'organization-members', label: 'Members', path: '/app/agchain/settings/organization/members', icon: IconUsers },
      { id: 'organization-permission-groups', label: 'Permission Groups', path: '/app/agchain/settings/organization/permission-groups', icon: IconShield },
      { id: 'organization-api-keys', label: 'API Keys', path: '/app/agchain/settings/organization/api-keys', icon: IconApi, limited: true },
      { id: 'organization-ai-providers', label: 'AI Providers', path: '/app/agchain/settings/organization/ai-providers', icon: IconKey, limited: true },
    ],
  },
  {
    id: 'project',
    label: 'Project',
    items: [
      { id: 'project-general', label: 'General', path: '/app/agchain/settings/project/general', icon: IconSettings, limited: true },
      { id: 'project-members', label: 'Members', path: '/app/agchain/settings/project/members', icon: IconUsers, limited: true },
      { id: 'project-access', label: 'Access', path: '/app/agchain/settings/project/access', icon: IconLock, limited: true },
      { id: 'project-benchmark-definition', label: 'Benchmark Definition', path: '/app/agchain/settings/project/benchmark-definition', icon: IconAdjustmentsHorizontal },
    ],
  },
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { id: 'personal-preferences', label: 'Preferences', path: '/app/agchain/settings/personal/preferences', icon: IconBuilding, limited: true },
      { id: 'personal-credentials', label: 'Credentials', path: '/app/agchain/settings/personal/credentials', icon: IconCreditCard, limited: true },
    ],
  },
];

function matchesPath(itemPath: string, pathname: string) {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function AgchainSettingsNav() {
  const location = useLocation();
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return AGCHAIN_SETTINGS_NAV;

    return AGCHAIN_SETTINGS_NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(normalized)),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <nav
      aria-label="AGChain settings navigation"
      data-testid="agchain-settings-nav"
      className="flex h-full flex-col overflow-hidden border-r border-sidebar-border bg-sidebar-accent"
    >
      <div className="border-b border-sidebar-border px-3 py-3">
        <AgchainSettingsSearch value={query} onChange={setQuery} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="space-y-5">
          {filteredGroups.map((group) => (
            <section key={group.id} aria-label={group.label}>
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {group.label}
              </p>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = matchesPath(item.path, location.pathname);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-accent text-foreground'
                          : 'text-foreground/75 hover:bg-accent/60 hover:text-foreground',
                      )}
                    >
                      <ItemIcon size={15} stroke={1.75} className="shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.limited ? (
                        <span className="rounded-full border border-border/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Soon
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredGroups.length === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">No settings match your search.</div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
