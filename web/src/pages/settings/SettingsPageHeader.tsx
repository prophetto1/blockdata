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
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background">
      {!hideHeader ? (
        <header
          className={cn(
            'flex justify-between gap-3 border-b border-border bg-muted/30',
            isAdminVariant ? 'min-h-[4.75rem] items-center px-5 py-3' : 'items-start px-4 py-2',
          )}
        >
          <div className="min-w-0">
            <h2
              className={cn(
                'truncate font-semibold text-foreground',
                isAdminVariant ? 'text-base leading-6' : 'text-sm',
              )}
            >
              {title}
            </h2>
            {description && (
              <p
                className={cn(
                  'text-muted-foreground',
                  isAdminVariant ? 'mt-1 text-sm leading-5' : 'mt-0.5 text-xs',
                )}
              >
                {description}
              </p>
            )}
          </div>
          {headerAction}
        </header>
      ) : null}

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
