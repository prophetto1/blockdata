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
}: {
  services: PipelineServiceViewModel[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
        <section className="rounded-2xl border border-border bg-card px-6 py-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Pipeline Services
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Pipeline Services
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Launch focused backend pipelines that turn owned sources into reusable retrieval artifacts.
            </p>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Open a dedicated workbench for each service from the catalog below.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <article
              key={service.slug}
              className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">{service.label}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">{service.description}</p>
                </div>
                <div className="grid gap-2 text-sm text-foreground">
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
                  className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                >
                  Open {service.label}
                </Link>
              </div>
            </article>
          ))}
        </section>

        {loading ? (
          <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
            Loading pipeline definitions...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
