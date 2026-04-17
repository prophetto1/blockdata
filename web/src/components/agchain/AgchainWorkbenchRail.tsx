import { NavLink } from 'react-router-dom';
import { IconGitBranch, IconLayoutDashboard, IconWand } from '@tabler/icons-react';
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
      <div className="flex h-full min-h-0 flex-col items-center px-2 py-4">
        <div className="flex flex-col items-center gap-2">
          {WORKBENCH_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                title={item.label}
                className={({ isActive }) => cn(
                  'inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-transparent transition-colors active:scale-95',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/62 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Icon size={18} stroke={1.8} className="shrink-0" />
              </NavLink>
            );
          })}
        </div>

        <div className="mt-auto flex w-full justify-center border-t border-sidebar-border/70 pt-4">
          <NavLink
            to="/app/agchain/overview"
            aria-label="Back to AGChain"
            title="Back to AGChain"
            className={({ isActive }) => cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-transparent transition-colors active:scale-95',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/52 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <IconLayoutDashboard size={18} stroke={1.8} className="shrink-0" />
          </NavLink>
        </div>
      </div>
    </div>
  );
}
