type AgchainSectionPageProps = {
  title: string;
  description: string;
  bullets: string[];
};

export function AgchainSectionPage({ title, description, bullets }: AgchainSectionPageProps) {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-8 py-10">
        <section className="rounded-3xl border border-border/70 bg-card/80 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">AG chain</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {bullets.map((bullet) => (
            <article key={bullet} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <p className="text-sm leading-7 text-card-foreground">{bullet}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
