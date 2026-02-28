import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppIcon } from '@/components/ui/app-icon';
import { useSuperuserProbe } from '@/hooks/useSuperuserProbe';
import { styleTokens } from '@/lib/styleTokens';
import { cn } from '@/lib/utils';
import { SETTINGS_NAV, findNavItemByPath, type SettingsNavGroup } from './settings-nav';
const AI_STACK_TABS = [
  { id: 'ai-providers', label: 'AI Providers', path: '/app/settings/ai' },
  { id: 'model-roles', label: 'Model Roles', path: '/app/settings/model-roles' },
  { id: 'mcp', label: 'MCP Servers', path: '/app/settings/mcp' },
] as const;

function NavGroup({
  group,
  activeId,
  onNavigate,
}: {
  group: SettingsNavGroup;
  activeId: string | null;
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
        {group.label}
      </h3>
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.path)}
                style={{ fontSize: '15px', fontWeight: 600 }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 h-9 leading-snug transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                {item.icon && (
                  <AppIcon
                    icon={item.icon}
                    context="inline"
                    tone={isActive ? 'default' : 'muted'}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperuser = useSuperuserProbe() === true;
  const primaryGroups = SETTINGS_NAV.filter((g) => g.id !== 'admin');
  const adminGroup = isSuperuser ? SETTINGS_NAV.find((g) => g.id === 'admin') : null;

  const activeItem = useMemo(
    () => findNavItemByPath(location.pathname),
    [location.pathname],
  );

  const activeId = activeItem?.id ?? null;
  const isAiStackRoute = AI_STACK_TABS.some((tab) => location.pathname.startsWith(tab.path));

  return (
    <div className="flex h-[calc(100vh-var(--app-shell-header-height))] overflow-hidden">
      {/* Second rail — matches Schemas rail styling */}
      <aside
        className="w-[250px] shrink-0 overflow-y-auto border-r font-sans text-sidebar-foreground"
        style={{
          borderColor: styleTokens.adminConfig.railBorder,
          backgroundColor: styleTokens.adminConfig.railBackground,
        }}
      >
        <nav className="px-2 py-4">
          <div className="space-y-5">
            {primaryGroups.map((group) => (
              <NavGroup
                key={group.id}
                group={group}
                activeId={activeId}
                onNavigate={(path) => navigate(path)}
              />
            ))}
          </div>

          {adminGroup && (
            <div className="mt-5 border-t border-sidebar-border pt-4">
              <NavGroup
                group={adminGroup}
                activeId={activeId}
                onNavigate={(path) => navigate(path)}
              />
            </div>
          )}
        </nav>
      </aside>

      {/* Content area */}
      <section className="min-w-0 flex-1 overflow-hidden p-6" style={{ backgroundColor: styleTokens.adminConfig.contentBackground }}>
        <div className="h-full min-h-0 overflow-hidden">
          {isAiStackRoute && (
            <div className="mb-3 rounded-md border border-border bg-background p-2">
              <div className="flex flex-wrap items-center gap-2">
                {AI_STACK_TABS.map((tab) => {
                  const isActive = location.pathname.startsWith(tab.path);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => navigate(tab.path)}
                      className={cn(
                        'inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors',
                        isActive
                          ? 'border-primary/40 bg-primary/15 text-foreground'
                          : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </section>
    </div>
  );
}
