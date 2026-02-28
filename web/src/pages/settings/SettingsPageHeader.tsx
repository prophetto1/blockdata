import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SettingsPageHeaderProps = {
  title: string;
  description?: string;
  /** Toolbar slot — rendered inline after the description */
  toolbar?: ReactNode;
};

export function SettingsPageHeader({ title, description, toolbar }: SettingsPageHeaderProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
          {toolbar}
        </div>
      )}
    </div>
  );
}

type SettingsPageFrameProps = {
  title: string;
  description?: string;
  headerAction?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
};

export function SettingsPageFrame({
  title,
  description,
  headerAction,
  toolbar,
  children,
  bodyClassName,
}: SettingsPageFrameProps) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background">
      <header className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {headerAction}
      </header>

      <div className={cn('min-h-0 flex-1 overflow-y-auto bg-background p-3 md:p-4', bodyClassName)}>
        {toolbar && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-2">
            {toolbar}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

type SettingsSectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <section className="rounded-md bg-transparent p-0">
      {title && (
        <>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          <div className="mt-4">{children}</div>
        </>
      )}
      {!title && children}
    </section>
  );
}
