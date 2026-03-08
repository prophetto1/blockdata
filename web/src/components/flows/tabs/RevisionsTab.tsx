import { useEffect, useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';

type FlowRevision = {
  revision: number;
  source: string;
  created_at: string;
};

export function RevisionsTab({ flowId }: { flowId: string }) {
  const [revisions, setRevisions] = useState<FlowRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    supabase
      .from('flow_sources')
      .select('revision, source, created_at')
      .eq('flow_id', flowId)
      .order('revision', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setRevisions([]);
        } else {
          const rows = (data ?? []) as FlowRevision[];
          setRevisions(rows);
          if (rows.length >= 2) {
            setSelectedA(rows[1].revision);
            setSelectedB(rows[0].revision);
          }
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [flowId]);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading...</div>;
  }

  if (revisions.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-4 py-3">
        <AppIcon icon={IconInfoCircle} context="inline" tone="accent" className="shrink-0" />
        <span className="text-sm font-medium text-accent-foreground">Only one revision exists for this flow</span>
      </div>
    );
  }

  const sourceA = revisions.find((r) => r.revision === selectedA)?.source ?? '';
  const sourceB = revisions.find((r) => r.revision === selectedB)?.source ?? '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          From:
          <select
            value={selectedA ?? ''}
            onChange={(e) => setSelectedA(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-ring outline-none"
          >
            {revisions.map((r) => (
              <option key={r.revision} value={r.revision}>r{r.revision} — {new Date(r.created_at).toLocaleDateString()}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          To:
          <select
            value={selectedB ?? ''}
            onChange={(e) => setSelectedB(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-ring outline-none"
          >
            {revisions.map((r) => (
              <option key={r.revision} value={r.revision}>r{r.revision} — {new Date(r.created_at).toLocaleDateString()}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ScrollArea className="rounded-md border border-border bg-card max-h-[600px]">
          <div className="sticky top-0 border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            Revision {selectedA}
          </div>
          <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap">{sourceA}</pre>
        </ScrollArea>
        <ScrollArea className="rounded-md border border-border bg-card max-h-[600px]">
          <div className="sticky top-0 border-b border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            Revision {selectedB}
          </div>
          <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap">{sourceB}</pre>
        </ScrollArea>
      </div>
    </div>
  );
}
