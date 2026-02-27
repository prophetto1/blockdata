import { useMemo } from 'react';
import type { KVRow } from './kvTypes';

type InheritedKVsProps = {
  namespace: string;
  rows: KVRow[];
};

export default function InheritedKVs({ namespace, rows }: InheritedKVsProps) {
  const inherited = useMemo(
    () => rows.filter((row) => row.namespace !== namespace),
    [namespace, rows],
  );

  if (inherited.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-5 text-sm text-muted-foreground">
        No inherited key-value pairs for <code>{namespace}</code>.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[700px] text-sm">
        <thead className="bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Namespace</th>
            <th className="px-3 py-2 text-left font-medium">Key</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-3 py-2 text-left font-medium">Last Modified</th>
            <th className="px-3 py-2 text-left font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {inherited.map((row) => (
            <tr key={`${row.namespace}-${row.key}`} className="border-t border-border/70">
              <td className="px-3 py-2 align-top">
                <code>{row.namespace}</code>
              </td>
              <td className="px-3 py-2 align-top">
                <code>{row.key}</code>
              </td>
              <td className="px-3 py-2 align-top text-muted-foreground">{row.description}</td>
              <td className="px-3 py-2 align-top text-muted-foreground">
                {new Date(row.updateDate).toLocaleString()}
              </td>
              <td className="px-3 py-2 align-top">
                <span className="rounded border border-border px-1.5 py-0.5 text-[11px]">{row.type}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

