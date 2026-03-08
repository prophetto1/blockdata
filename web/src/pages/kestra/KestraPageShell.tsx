import { IconAdjustments, IconBookmark, IconFilter, IconRefresh, IconSearch } from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';

type KestraPageShellProps = {
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  columns: string[];
  emptyTitle: string;
  emptyDescription: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
};

export default function KestraPageShell({
  title,
  subtitle,
  searchPlaceholder,
  columns,
  emptyTitle,
  emptyDescription,
  primaryActionLabel,
  secondaryActionLabel,
}: KestraPageShellProps) {
  useShellHeaderTitle({ title, subtitle });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <section className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActionLabel ? <Button variant="outline">{secondaryActionLabel}</Button> : null}
            {primaryActionLabel ? <Button>{primaryActionLabel}</Button> : null}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm">
              <IconFilter />
              Add filters
            </Button>

            <label className="relative min-w-[220px] flex-1 max-w-[320px]">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm">
                <IconRefresh />
                Refresh data
              </Button>
              <Button variant="outline" size="icon" aria-label="Save current filters">
                <IconBookmark />
              </Button>
              <Button variant="outline" size="sm">
                Saved filters
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">0</span>
              </Button>
              <Button variant="outline" size="icon" aria-label="Page display settings">
                <IconAdjustments />
              </Button>
            </div>
          </div>

          <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
            Clear all
          </button>

          <div className="overflow-hidden rounded-md border border-border">
            <div className="overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {columns.map((column) => (
                      <th key={column} className="px-3 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center">
                      <div className="mx-auto flex max-w-xl flex-col items-center gap-2">
                        <div className="h-16 w-16 rounded-2xl border border-dashed border-border bg-muted/40" />
                        <p className="text-base font-semibold text-foreground">{emptyTitle}</p>
                        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
