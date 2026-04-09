import type { CoordinationStatusResponse } from '@/lib/coordinationApi';

type CoordinationStatusSummaryProps = {
  status: CoordinationStatusResponse | null;
  loading: boolean;
};

function renderValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '--';
  return String(value);
}

export function CoordinationStatusSummary({ status, loading }: CoordinationStatusSummaryProps) {
  const cards = [
    {
      label: 'Broker',
      value: loading ? 'Loading...' : renderValue(status?.broker.state),
      detail: status?.broker.error_type ? `Error: ${status.broker.error_type}` : renderValue(status?.broker.url),
    },
    {
      label: 'Stream Bridge',
      value: loading ? 'Loading...' : renderValue(status?.stream_bridge.state),
      detail: `${status?.stream_bridge.client_count ?? 0} clients`,
    },
    {
      label: 'Active Agents',
      value: loading ? 'Loading...' : renderValue(status?.presence_summary.active_agents),
      detail: 'Current KV presence count',
    },
    {
      label: 'Buffered Events',
      value: loading ? 'Loading...' : renderValue(status?.local_host_outbox_backlog.events),
      detail: `${status?.local_host_outbox_backlog.files ?? 0} files`,
    },
  ];

  return (
    <section
      data-testid="coordination-status-summary"
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-border/70 bg-card/80 px-3 py-3 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {card.label}
          </p>
          <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{card.value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{card.detail}</p>
        </article>
      ))}
    </section>
  );
}
