import { useNavigate } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

export default function EarlyAccess() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-5xl px-4 pt-20 pb-16 sm:px-6 md:px-8 md:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">Early Access</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              We're building.
            </h1>

            <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
              BlockData is under active development. We're building the core pipeline — ingest, transform, extract, serve — and we'll open signups when it's ready.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 gap-2 rounded-full px-8 text-base"
                onClick={() => navigate('/')}
              >
                Back to home
                <IconArrowRight size={18} />
              </Button>
            </div>
          </div>
        </section>
    </div>
  );
}
