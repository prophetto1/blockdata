export function IndexJobConfigTab() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Processing configuration</h3>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source type</div>
            <div className="mt-1 text-sm text-foreground">Markdown</div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chunking</div>
            <div className="mt-1 text-sm text-foreground">Auto (512 tokens)</div>
          </div>
          <div className="rounded-md border border-border bg-background/60 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Embedding</div>
            <div className="mt-1 text-sm text-foreground">Auto-resolved from user settings</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Configuration options will be available in a future update.
        </p>
      </div>
    </div>
  );
}
