import { useState } from 'react';
import type { AgchainDatasetSampleDetail } from '@/lib/agchainDatasets';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

type AgchainDatasetSampleDrawerProps = {
  sample: AgchainDatasetSampleDetail | null;
  open: boolean;
  onClose: () => void;
};

function CollapsibleSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-foreground hover:text-foreground/80"
      >
        {title}
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-background/50 p-3 text-xs text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export function AgchainDatasetSampleDrawer({ sample, open, onClose }: AgchainDatasetSampleDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[480px] overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>
            {sample ? `Detail: ${sample.sample_id}` : 'Sample Detail'}
          </SheetTitle>
        </SheetHeader>

        {sample && (
          <div className="mt-4 flex flex-col">
            <CollapsibleSection title="Canonical JSON" defaultOpen>
              <JsonBlock data={sample.canonical_sample_json} />
            </CollapsibleSection>

            <CollapsibleSection title="Metadata">
              <JsonBlock data={sample.metadata_json} />
            </CollapsibleSection>

            {sample.setup && (
              <CollapsibleSection title="Setup">
                <JsonBlock data={sample.setup} />
              </CollapsibleSection>
            )}

            {sample.sandbox && (
              <CollapsibleSection title="Sandbox">
                <JsonBlock data={sample.sandbox} />
              </CollapsibleSection>
            )}

            {sample.files && sample.files.length > 0 && (
              <CollapsibleSection title="Files">
                <JsonBlock data={sample.files} />
              </CollapsibleSection>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
