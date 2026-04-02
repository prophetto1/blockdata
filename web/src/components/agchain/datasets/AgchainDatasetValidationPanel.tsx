import { useState } from 'react';
import type { AgchainDatasetValidationSummary } from '@/lib/agchainDatasets';
import { Badge } from '@/components/ui/badge';

type AgchainDatasetValidationPanelProps = {
  validation: AgchainDatasetValidationSummary | null;
  loading: boolean;
};

const STATUS_BADGE: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  pass: 'green',
  warn: 'yellow',
  fail: 'red',
  unknown: 'gray',
};

export function AgchainDatasetValidationPanel({
  validation,
  loading,
}: AgchainDatasetValidationPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/70 px-5 py-4 text-sm text-muted-foreground">
        Loading validation results...
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="rounded-xl border border-border/70 bg-card/70 px-5 py-4 text-sm text-muted-foreground">
        No validation data available.
      </div>
    );
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card/70">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">Validation Results</h3>
        <Badge variant={STATUS_BADGE[validation.validation_status] ?? 'gray'} size="sm">
          {validation.validation_status.toUpperCase()}
        </Badge>
      </div>

      <div className="px-5 py-3">
        <div className="flex gap-6 text-sm text-muted-foreground">
          {validation.duplicate_id_count > 0 && (
            <span>Duplicate IDs: {validation.duplicate_id_count}</span>
          )}
          {validation.missing_field_count > 0 && (
            <span>Missing Required Fields: {validation.missing_field_count}</span>
          )}
          {validation.unsupported_payload_count > 0 && (
            <span>Unsupported Payloads: {validation.unsupported_payload_count}</span>
          )}
          {validation.warning_count === 0 && <span>No issues found.</span>}
        </div>
      </div>

      {validation.issue_groups.length > 0 && (
        <div className="border-t border-border/50">
          {validation.issue_groups.map((group) => (
            <div key={group.key} className="border-b border-border/30 last:border-b-0">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="flex w-full items-center justify-between px-5 py-3 text-sm text-foreground hover:bg-accent/10"
              >
                <span>
                  {group.label}: {group.count}
                </span>
                <svg
                  className={`h-4 w-4 text-muted-foreground transition-transform ${expandedGroups.has(group.key) ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {expandedGroups.has(group.key) && (
                <div className="bg-background/30 px-5 py-2">
                  <pre className="max-h-40 overflow-auto text-xs text-muted-foreground">
                    {JSON.stringify(group.issues, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
