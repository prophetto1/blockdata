import { useState } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { useLoadRun } from '@/hooks/useLoadRun';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

const selectClass = cn(inputClass, 'appearance-none');

type WizardStep = 'source' | 'destination' | 'configure' | 'running';

export default function LoadPage() {
  useShellHeaderTitle({ title: 'Load', breadcrumbs: ['Load'] });

  const {
    sourceFunctions, destFunctions, connections,
    loading, submitting, stepping, error,
    activeRun, runItems,
    submitLoad, stepLoad, reset,
  } = useLoadRun();

  const [step, setStep] = useState<WizardStep>('source');
  const [sourceFunction, setSourceFunction] = useState('');
  const [sourceConnection, setSourceConnection] = useState('');
  const [destFunction, setDestFunction] = useState('');
  const [destConnection, setDestConnection] = useState('');
  const [bucket, setBucket] = useState('');
  const [prefix, setPrefix] = useState('');
  const [glob, setGlob] = useState('*.csv');
  const [collection, setCollection] = useState('');
  const [createCollection, setCreateCollection] = useState(false);
  const [keyColumn, setKeyColumn] = useState('');

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading configuration...</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    const srcFn = sourceFunctions.find((f) => f.function_name === sourceFunction);
    const downloadFn = sourceFunctions.find(
      (f) => f.service_name === srcFn?.service_name && f.function_name.includes('download'),
    );

    try {
      await submitLoad({
        source_function_name: sourceFunction,
        source_download_function: downloadFn?.function_name ?? `${sourceFunction.replace('_list', '_download_csv')}`,
        source_connection_id: sourceConnection,
        dest_function_name: destFunction,
        dest_connection_id: destConnection,
        config: {
          bucket, prefix, glob, collection,
          create_collection: createCollection,
          key_column: keyColumn || undefined,
        },
      });
      setStep('running');
    } catch {
      // error is set in hook
    }
  };

  const handleStepAll = async () => {
    if (!activeRun) return;
    let remaining = activeRun.rows_affected ?? 0;
    while (remaining > 0) {
      const result = await stepLoad();
      if (!result) break;
      remaining = result.remaining ?? 0;
      if (result.status && ['complete', 'partial', 'failed', 'cancelled'].includes(result.status)) break;
    }
  };

  // Running view
  if (step === 'running' && activeRun) {
    const completedItems = runItems.filter((i) => i.status === 'complete').length;
    const failedItems = runItems.filter((i) => i.status === 'failed').length;
    const totalItems = activeRun.rows_affected ?? runItems.length;
    const isFinished = ['complete', 'partial', 'failed', 'cancelled'].includes(activeRun.status);

    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Load Run</h2>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  activeRun.status === 'complete' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
                  activeRun.status === 'running' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                  activeRun.status === 'pending' && 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
                  activeRun.status === 'partial' && 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
                  activeRun.status === 'failed' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                )}>
                  {activeRun.status}
                </span>
                <span className="text-sm text-muted-foreground">
                  {completedItems}/{totalItems} items complete
                  {failedItems > 0 && `, ${failedItems} failed`}
                </span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  failedItems > 0 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${totalItems > 0 ? ((completedItems + failedItems) / totalItems) * 100 : 0}%` }}
              />
            </div>

            <div className="flex gap-2">
              {!isFinished && (
                <button
                  type="button"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  onClick={handleStepAll}
                  disabled={stepping}
                >
                  {stepping ? 'Processing...' : 'Process All Items'}
                </button>
              )}
              <button
                type="button"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                onClick={() => { reset(); setStep('source'); }}
              >
                {isFinished ? 'New Load' : 'Back'}
              </button>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                {error}
              </div>
            )}

            {runItems.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-sm font-medium text-foreground">Items</h3>
                {runItems.map((item) => (
                  <div
                    key={item.item_id}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <span className="truncate font-mono text-xs text-foreground">{item.item_key}</span>
                    <div className="flex items-center gap-2">
                      {item.rows_written > 0 && (
                        <span className="text-xs text-muted-foreground">{item.rows_written} rows</span>
                      )}
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                        item.status === 'complete' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
                        item.status === 'running' && 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
                        item.status === 'pending' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        item.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                      )}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Wizard view
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}

          <section className="space-y-4 rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">1. Source</h3>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Source Function</label>
              <select className={selectClass} value={sourceFunction} onChange={(e) => setSourceFunction(e.target.value)}>
                <option value="">Select source...</option>
                {sourceFunctions.filter((f) => f.function_name.includes('list')).map((f) => (
                  <option key={f.function_id} value={f.function_name}>{f.label} ({f.service_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Source Connection</label>
              <select className={selectClass} value={sourceConnection} onChange={(e) => setSourceConnection(e.target.value)}>
                <option value="">Select connection...</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>{c.provider} ({c.connection_type})</option>
                ))}
              </select>
            </div>
            {sourceFunction && sourceConnection && step === 'source' && (
              <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" onClick={() => setStep('destination')}>
                Next: Destination
              </button>
            )}
          </section>

          {(step === 'destination' || step === 'configure') && (
            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">2. Destination</h3>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Destination Function</label>
                <select className={selectClass} value={destFunction} onChange={(e) => setDestFunction(e.target.value)}>
                  <option value="">Select destination...</option>
                  {destFunctions.map((f) => (
                    <option key={f.function_id} value={f.function_name}>{f.label} ({f.service_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Destination Connection</label>
                <select className={selectClass} value={destConnection} onChange={(e) => setDestConnection(e.target.value)}>
                  <option value="">Select connection...</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>{c.provider} ({c.connection_type})</option>
                  ))}
                </select>
              </div>
              {destFunction && destConnection && step === 'destination' && (
                <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" onClick={() => setStep('configure')}>
                  Next: Configure
                </button>
              )}
            </section>
          )}

          {step === 'configure' && (
            <section className="space-y-4 rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">3. Configuration</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Bucket <span className="text-red-500">*</span></label>
                  <input type="text" className={inputClass} value={bucket} onChange={(e) => setBucket(e.target.value)} placeholder="my-gcs-bucket" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Prefix</label>
                  <input type="text" className={inputClass} value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="data/exports/" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">File Pattern</label>
                  <input type="text" className={inputClass} value={glob} onChange={(e) => setGlob(e.target.value)} placeholder="*.csv" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Key Column</label>
                  <input type="text" className={inputClass} value={keyColumn} onChange={(e) => setKeyColumn(e.target.value)} placeholder="id (optional, maps to _key)" />
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Collection <span className="text-red-500">*</span></label>
                  <input type="text" className={inputClass} value={collection} onChange={(e) => setCollection(e.target.value)} placeholder="my_collection" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input type="checkbox" id="create-collection" checked={createCollection} onChange={(e) => setCreateCollection(e.target.checked)} className="h-4 w-4 rounded border-input" />
                  <label htmlFor="create-collection" className="text-xs text-muted-foreground">Create collection if it doesn't exist</label>
                </div>
              </div>
              <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" onClick={handleSubmit} disabled={submitting || !bucket || !collection}>
                {submitting ? 'Submitting...' : 'Start Load'}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
