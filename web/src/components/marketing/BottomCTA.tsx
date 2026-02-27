import { useNavigate } from 'react-router-dom';
import { IconArrowRight } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';

interface BottomCTAProps {
  headline?: string;
  description?: string;
}

export function BottomCTA({
  headline = 'Ready to build?',
  description = 'Connect your first source, configure a pipeline, and see structured results — block by block.',
}: BottomCTAProps) {
  const navigate = useNavigate();

  return (
    <section className="px-4 pb-24 pt-8 sm:px-6 md:px-8 md:pb-32">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card/80">
        <div className="flex flex-col items-center gap-8 px-8 py-14 md:flex-row md:justify-between md:px-14 md:py-16">
          <div className="max-w-lg text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {headline}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="shrink-0">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-primary px-8 text-base text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={() => navigate('/register')}
            >
              Get started free
              <IconArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
