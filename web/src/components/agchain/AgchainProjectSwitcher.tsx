import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';

export function AgchainProjectSwitcher() {
  const {
    items,
    loading,
    error,
    focusedProject,
    focusedProjectSlug,
    setFocusedProjectSlug,
    reload,
  } = useAgchainProjectFocus();
  const [open, setOpen] = useState(false);

  const triggerLabel = focusedProject?.benchmark_name
    ?? focusedProjectSlug
    ?? (loading ? 'Loading AGChain projects' : 'Select AGChain project');

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="agchain-project-context"
        className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {triggerLabel}
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            AGChain projects
          </div>

          {error ? (
            <div className="space-y-2 px-2 py-1">
              <p className="text-sm text-destructive">{error}</p>
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-border px-2 py-1 text-sm font-medium"
                onClick={() => {
                  void reload();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {!error && loading ? (
            <div className="px-2 py-1 text-sm text-muted-foreground">Loading projects...</div>
          ) : null}

          {!error && !loading ? (
            <div className="space-y-1">
              {items.map((item) => {
                const isFocused = item.benchmark_slug === focusedProjectSlug;

                return (
                  <button
                    key={item.benchmark_id}
                    type="button"
                    className="flex w-full items-start justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setFocusedProjectSlug(item.benchmark_slug);
                      setOpen(false);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.benchmark_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                    </span>
                    {isFocused ? (
                      <span className="ml-3 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Focused
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-2 border-t border-border pt-2">
            <Link
              to="/app/agchain/projects"
              className="inline-flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setOpen(false)}
            >
              Open project registry
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
