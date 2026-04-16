import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type PipelineServiceViewModel = {
  slug: string;
  label: string;
  description: string;
  pipelineKind: string;
  eligibleSourceTypes: string[];
  deliverableKinds: string[];
};

export function PipelineCatalogPanel({
  services,
  loading,
  error,
  probePanel,
}: {
  services: PipelineServiceViewModel[];
  loading: boolean;
  error: string | null;
  probePanel?: ReactNode;
}) {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-5">
        <header>
          <h1 className="text-lg font-semibold text-foreground">Pipeline Services</h1>
        </header>

        {probePanel ? <section>{probePanel}</section> : null}

        {loading ? (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            Loading pipeline definitions...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <section className="grid gap-3 md:grid-cols-2">
            {services.map((service) => (
              <article
                key={service.slug}
                className="rounded-lg border border-border bg-card px-5 py-4"
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-foreground">{service.label}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{service.description}</p>
                  </div>
                  <div className="grid gap-1 text-xs text-foreground">
                    <div>
                      <span className="text-muted-foreground">Pipeline kind:</span>{' '}
                      <span className="font-medium">{service.pipelineKind}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source types:</span>{' '}
                      <span className="font-medium">{service.eligibleSourceTypes.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deliverables:</span>{' '}
                      <span className="font-medium">{service.deliverableKinds.join(', ')}</span>
                    </div>
                  </div>
                  <Link
                    to={`/app/pipeline-services/${service.slug}`}
                    className="inline-flex items-center rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 active:scale-95"
                  >
                    Open {service.label}
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
