import type { CoordinationIdentityResponse } from '@/lib/coordinationApi';
import { getCoordinationSessionClassificationLabel } from '@/lib/coordinationSessionClassification';

type CoordinationIdentityTableProps = {
  data: CoordinationIdentityResponse | null;
  loading: boolean;
};

function renderValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '--';
  return String(value);
}

function renderParts(parts: Array<string | null | undefined>) {
  const values = parts.filter((part) => typeof part === 'string' && part.trim().length > 0);
  return values.length > 0 ? values.join(' · ') : '--';
}

function getIdentityRowKey(
  identity: CoordinationIdentityResponse['identities'][number],
  index: number,
) {
  return [
    identity.host ?? 'unknown-host',
    identity.lease_identity ?? identity.identity ?? identity.session_agent_id ?? 'unknown-identity',
    identity.revision ?? identity.claimed_at ?? `row-${index}`,
    index,
  ].join('-');
}

export function CoordinationIdentityTable({
  data,
  loading,
}: CoordinationIdentityTableProps) {
  const summary = data?.summary;
  const identities = data?.identities ?? [];

  return (
    <section
      data-testid="coordination-identity-table"
      className="overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm"
    >
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Claimed Identities</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Server-owned session classification over lease-backed worker identities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {loading ? 'Loading...' : `${summary?.active_count ?? 0} active`}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {loading ? 'Loading...' : `${summary?.stale_count ?? 0} stale`}
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">
              {loading ? 'Loading...' : `${summary?.host_count ?? 0} host`}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading claimed identities...</p>
        ) : identities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No claimed identities are currently visible.</p>
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Session Type</th>
                <th className="pb-2 pr-4 font-medium">Session</th>
                <th className="pb-2 pr-4 font-medium">Lease</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {identities.map((identity, index) => {
                const primaryLabel = getCoordinationSessionClassificationLabel(identity.session_classification);
                const classificationKey =
                  typeof identity.session_classification?.key === 'string'
                    ? identity.session_classification.key
                    : 'unknown';
                const classificationProvenanceKey =
                  typeof identity.session_classification?.provenance?.key === 'string'
                    ? identity.session_classification.provenance.key
                    : 'unknown';
                const classificationReason =
                  typeof identity.session_classification?.reason === 'string' &&
                  identity.session_classification.reason.trim().length > 0
                    ? identity.session_classification.reason
                    : null;
                const legacyIdentity =
                  identity.identity && identity.identity !== identity.lease_identity
                    ? `legacy ${identity.identity}`
                    : null;

                return (
                <tr
                  key={getIdentityRowKey(identity, index)}
                  data-testid="coordination-identity-row"
                  className="border-b border-border/50 align-top last:border-b-0"
                >
                  <td className="py-3 pr-4">
                    <p className="font-medium text-foreground">{primaryLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {renderParts([
                        `lease ${identity.lease_identity}`,
                        legacyIdentity,
                        identity.family ? `family ${identity.family}` : null,
                      ])}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="break-all text-foreground">{renderValue(identity.session_agent_id)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {renderParts([
                        identity.host,
                        identity.revision !== null && identity.revision !== undefined
                          ? `rev ${identity.revision}`
                          : null,
                      ])}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-foreground">{renderValue(identity.claimed_at)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      hb {renderValue(identity.last_heartbeat_at)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      exp {renderValue(identity.expires_at)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {classificationKey}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        identity.stale
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-emerald-500/15 text-emerald-700'
                      }`}
                    >
                      {identity.stale ? 'stale' : 'active'}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {classificationProvenanceKey}
                    </p>
                    {classificationReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {classificationReason}
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
