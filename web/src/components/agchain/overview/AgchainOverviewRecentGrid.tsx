import { Link } from 'react-router-dom';
import { agchainOverviewRecentItems } from './agchainOverviewPlaceholderData';

export function AgchainOverviewRecentGrid() {
  return (
    <section data-testid="agchain-overview-recent-grid" className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">Recently created</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Placeholder objects that show where the overview-first shell will route the next AGChain surface wave.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agchainOverviewRecentItems.map((item) => (
          <Link
            key={item.title}
            to={item.href}
            className="block rounded-2xl border border-border/70 bg-background/60 p-4 transition-colors hover:bg-accent/30"
          >
            <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${item.accentClass}`}>
              {item.eyebrow}
            </div>
            <p className="mt-4 text-base font-semibold text-foreground">{item.title}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
