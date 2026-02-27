export function PublicFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-10 sm:px-6 md:px-8">
        <div className="flex flex-col items-center gap-1">
          <span className="inline-flex items-baseline text-sm font-semibold uppercase tracking-[0.2em]">
            <span className="text-foreground">Block</span>
            <span className="text-primary">Data</span>
          </span>
          <span className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} BlockData
          </span>
        </div>
      </div>
    </footer>
  );
}
