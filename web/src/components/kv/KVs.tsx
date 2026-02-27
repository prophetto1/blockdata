import KVTable from './KVTable';

export default function KVs() {
  return (
    <section className="flex min-h-0 flex-col gap-3">
      <header className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">KV Store</h2>
          <p className="text-sm text-muted-foreground">
            Design surface for namespace key-value management.
          </p>
        </div>
      </header>
      <KVTable />
    </section>
  );
}

