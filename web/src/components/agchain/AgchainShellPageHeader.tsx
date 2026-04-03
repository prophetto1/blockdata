import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useHeaderCenter } from '@/components/shell/HeaderCenterContext';

type AgchainShellPageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
};

export function AgchainShellPageHeader({
  title,
  description,
  eyebrow,
  action,
}: AgchainShellPageHeaderProps) {
  const { hasProvider, setPageHeader } = useHeaderCenter();

  const pageHeaderNode = useMemo(
    () => (
      <div data-testid="agchain-shell-page-header-content" className="min-w-0">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className={`truncate font-semibold tracking-tight text-foreground ${eyebrow ? 'mt-1 text-2xl' : 'text-2xl'}`}>
              {title}
            </h1>
            {description ? (
              <div className="truncate text-sm text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    ),
    [action, description, eyebrow, title],
  );

  useLayoutEffect(() => {
    if (!hasProvider) return undefined;

    setPageHeader(pageHeaderNode);
    return () => setPageHeader(null);
  }, [hasProvider, pageHeaderNode, setPageHeader]);

  if (hasProvider) {
    return null;
  }

  return pageHeaderNode;
}
