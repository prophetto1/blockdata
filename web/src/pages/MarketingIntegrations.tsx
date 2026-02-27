import { BottomCTA } from '@/components/marketing/BottomCTA';

export default function MarketingIntegrations() {
  return (
    <div className="overflow-hidden">

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, var(--primary) 0%, transparent 60%)',
            opacity: 0.08,
          }}
        />
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 md:px-8">
          <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl">
            Integrations
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            New content coming soon.
          </p>
        </div>
      </section>

      <BottomCTA />

    </div>
  );
}
