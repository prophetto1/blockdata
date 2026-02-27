import { useNavigate } from 'react-router-dom';
import { IconListDetails, IconBrain, IconRoute } from '@tabler/icons-react';
import { MarketingGrid } from '@/components/marketing/MarketingGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PlatformLanding() {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden">
      <section className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <Badge variant="secondary" className="w-fit">Data Pipeline Platform</Badge>
              <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight">
                Structured output,
                <br />
                <span className="text-muted-foreground">block by block.</span>
              </h1>
              <p className="max-w-lg text-xl leading-relaxed text-muted-foreground">
                Ingest documents and databases. Transform with code.
                Extract with AI. Review and export deterministic data with full provenance.
              </p>
              <div className="flex gap-3">
                <Button size="lg" onClick={() => navigate('/register')}>Get Started</Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/how-it-works')}>Read the Docs</Button>
              </div>
            </div>
            <div>
              <MarketingGrid />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Live processing preview</span>
                <span>7 blocks &middot; 2 extracted fields</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { icon: IconListDetails, title: 'Block-Level Granularity', text: 'Every paragraph, heading, and list item is addressed individually with a stable ID.' },
              { icon: IconBrain, title: 'Schema-Driven Extraction', text: 'Define fields per block. The AI fills them. You review before export.' },
              { icon: IconRoute, title: 'Composable Pipeline', text: 'Chain ingest, transform, extract, review, and export. Linear or DAG.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border/60 bg-card/80 p-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon size={20} />
                </div>
                <h3 className="mb-2 text-lg font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
