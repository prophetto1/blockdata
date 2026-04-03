import { AgchainPageHeader } from '@/components/agchain/AgchainPageHeader';
import { AgchainPageFrame } from '@/pages/agchain/AgchainPageFrame';

type AgchainSettingsPlaceholderLayoutProps = {
  title: string;
  description: string;
  note: string;
  eyebrow: string;
  meta?: string;
};

export function AgchainSettingsPlaceholderLayout({
  title,
  description,
  note,
  eyebrow,
  meta,
}: AgchainSettingsPlaceholderLayoutProps) {
  return (
    <AgchainPageFrame className="gap-6 py-8">
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="space-y-6">
          <AgchainPageHeader
            title={title}
            description={description}
            eyebrow={eyebrow}
            meta={meta}
          />

          <div className="rounded-2xl border border-dashed border-border/60 bg-background/30 px-4 py-5">
            <p className="text-sm leading-7 text-muted-foreground">{note}</p>
            <div className="mt-4 inline-flex items-center rounded-full border border-border/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Coming soon
            </div>
          </div>
        </div>
      </section>
    </AgchainPageFrame>
  );
}
