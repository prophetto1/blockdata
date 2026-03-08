import type { ReactNode } from 'react';
import { styleTokens } from '@/lib/styleTokens';

export type RightRailItem = {
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  eyebrow?: string;
};

export type RightRailSection = {
  title: string;
  items: RightRailItem[];
};

type RightRailShellProps = {
  title: string;
  description?: string;
  sections: RightRailSection[];
  footer?: ReactNode;
};

export function RightRailShell({
  title,
  description,
  sections,
  footer,
}: RightRailShellProps) {
  return (
    <aside
      aria-label={title}
      className="flex h-full min-h-0 flex-col border-l bg-[var(--chrome,var(--background))]"
      style={{
        width: `${styleTokens.shell.rightRailWidth}px`,
        borderColor: 'var(--border)',
      }}
    >
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <div className="px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {section.title}
                </h2>
              </div>

              <div className="space-y-3">
                {section.items.map((item) => {
                  const content = (
                    <div className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm transition-colors hover:border-foreground/20">
                      {item.eyebrow ? (
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.eyebrow}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                      {item.ctaLabel ? (
                        <p className="mt-3 text-xs font-medium text-foreground">{item.ctaLabel}</p>
                      ) : null}
                    </div>
                  );

                  return item.href ? (
                    <a
                      key={item.title}
                      href={item.href}
                      className="block"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={item.title}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {footer ? (
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          {footer}
        </div>
      ) : null}
    </aside>
  );
}
