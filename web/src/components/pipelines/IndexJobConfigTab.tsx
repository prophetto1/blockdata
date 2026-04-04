export function IndexJobConfigTab() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Current processing defaults</h3>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source type</div>
            <div className="mt-1 text-sm text-foreground">Markdown</div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chunking</div>
            <div className="mt-1 text-sm text-foreground">Automatic, target 512 tokens</div>
            <p className="mt-1 text-xs text-muted-foreground">
              The current pipeline packs chunks toward 512 tokens and hard-splits oversized sections at 1024.
            </p>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Embedding</div>
            <div className="mt-1 text-sm text-foreground">Resolved from your configured embedding settings</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          These defaults are read-only on this screen today. Per-definition overrides are not exposed yet.
        </p>
      </div>
    </div>
  );
}
