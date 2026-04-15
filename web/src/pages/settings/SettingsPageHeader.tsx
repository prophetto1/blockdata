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
  hideHeader?: boolean;
  children: ReactNode;
  bodyClassName?: string;
  headerVariant?: 'default' | 'admin';
};

export function SettingsPageFrame({
  title,
  description,
  headerAction,
  toolbar,
  hideHeader = false,
  children,
  bodyClassName,
  headerVariant = 'default',
}: SettingsPageFrameProps) {
  const isAdminVariant = headerVariant === 'admin';

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card/70 shadow-sm">
      {!hideHeader ? (
        <header
          className={cn(
            'flex justify-between gap-3 border-b border-border/70 bg-background/60',
            isAdminVariant ? 'items-start px-5 py-4 md:px-6' : 'items-start px-4 py-3',
          )}
        >
          <div className="min-w-0">
            <h2
              className={cn(
                'truncate font-semibold tracking-tight text-foreground',
                isAdminVariant ? 'text-base leading-6' : 'text-sm',
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  'text-muted-foreground',
                  isAdminVariant ? 'mt-1 max-w-3xl text-sm leading-6' : 'mt-1 text-xs leading-5',
                )}
              >
                {description}
              </p>
            )}
          </div>
          {headerAction}
        </header>
      ) : null}

      <div className={cn('min-h-0 flex-1 overflow-y-auto bg-transparent p-4', bodyClassName)}>
        {toolbar && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-3 shadow-sm">
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
