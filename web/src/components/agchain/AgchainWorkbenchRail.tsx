import { NavLink } from 'react-router-dom';
import { IconGitBranch, IconLayoutDashboard, IconWand } from '@tabler/icons-react';
import { AgchainOrganizationSwitcher } from '@/components/agchain/AgchainOrganizationSwitcher';
import { AgchainProjectSwitcher } from '@/components/agchain/AgchainProjectSwitcher';
import { cn } from '@/lib/utils';

const WORKBENCH_NAV_ITEMS = [
  {
    label: 'Eval Designer',
    path: '/app/agchain/eval-designer',
    icon: IconWand,
  },
  {
    label: 'Harness Designer',
    path: '/app/agchain/harness-designer',
    icon: IconGitBranch,
  },
] as const;

export function AgchainWorkbenchRail() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--chrome,var(--background))] text-sidebar-foreground">
      <div className="flex h-full min-h-0 flex-col px-3 py-3">
        <NavLink
          to="/app/agchain/overview"
          className="inline-flex items-baseline rounded-md px-1 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span>Block</span>
          <span className="text-primary">Data</span>
          <span className="ml-1 text-sidebar-foreground/60">Workbench</span>
        </NavLink>

        <div className="mt-3 flex w-full flex-col rounded-[8px] border border-border/70 bg-card/20 py-1">
          <AgchainOrganizationSwitcher />
          <div className="mx-2.5 h-px bg-border/50" />
          <AgchainProjectSwitcher />
        </div>

        <div className="mt-5">
          <div className="mb-1 px-1.5 text-[11px] font-normal text-sidebar-foreground/48">
            Designers
          </div>
          <div className="space-y-px">
            {WORKBENCH_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    'flex h-[30px] w-full items-center gap-2 rounded-[6px] px-2 text-[13px] font-medium leading-[1.35] transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/84 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon size={14} stroke={1.75} className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <NavLink
            to="/app/agchain/overview"
            className={({ isActive }) => cn(
              'flex h-[28px] w-full items-center gap-2 rounded-[6px] px-2 text-[12px] font-normal transition-colors',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/64 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <IconLayoutDashboard size={13} stroke={1.75} className="shrink-0" />
            <span className="truncate">Back to AGChain</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}
