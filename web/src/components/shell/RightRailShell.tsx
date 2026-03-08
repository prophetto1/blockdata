import type { ReactNode } from 'react';
import { IconHelp, IconSparkles } from '@tabler/icons-react';
import { styleTokens } from '@/lib/styleTokens';
import { useRightRailContext, type RightRailTab } from '@/components/shell/RightRailContext';
import { RightRailChatPanel } from '@/components/shell/RightRailChatPanel';

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

const TAB_DEFS: { id: RightRailTab; label: string; icon: typeof IconHelp }[] = [
  { id: 'help', label: 'Help', icon: IconHelp },
  { id: 'ai', label: 'AI', icon: IconSparkles },
];

export function RightRailShell({
  title,
  description,
  sections,
  footer,
}: RightRailShellProps) {
  const { activeTab, setActiveTab, content } = useRightRailContext();
  const hasHelp = content !== null;

  return (
    <aside
      aria-label={title}
      className="flex h-full min-h-0 flex-col border-l bg-[var(--chrome,var(--background))]"
      style={{
        width: `${styleTokens.shell.rightRailWidth}px`,
        borderColor: 'var(--border)',
      }}
    >
      {/* Tab bar */}
      {hasHelp && (
        <div
          className="flex shrink-0 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          {TAB_DEFS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                  isActive
                    ? 'border-b-2 border-primary text-foreground'
                    : 'border-b-2 border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon size={14} stroke={1.8} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'help' && hasHelp ? (
        <>
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
                      const cardContent = (
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
                          {cardContent}
                        </a>
                      ) : (
                        <div key={item.title}>
                          {cardContent}
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
        </>
      ) : (
        <RightRailChatPanel />
      )}
    </aside>
  );
}
