import { StatusBadge } from '@/components/documents/StatusBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { useParseTab } from './ParseTabPanel';

type ParseSettingsColumnProps = {
  selectedDoc: ProjectDocumentRow | null;
  parseTab: ReturnType<typeof useParseTab>;
};

function SettingSwitch({
  label,
}: {
  label: string;
}) {
  return (
    <div className="relative flex w-full min-w-0 items-start gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={false}
        disabled
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full border border-input bg-muted opacity-70 transition-colors"
      >
        <span className="block h-4 w-4 translate-x-0 rounded-full bg-background shadow transition-transform" />
      </button>
      <span className="min-w-0 flex-1 whitespace-normal break-words text-xs leading-4 text-foreground">
        {label}
      </span>
    </div>
  );
}

export function ParseSettingsColumn({
  selectedDoc,
  parseTab,
}: ParseSettingsColumnProps) {
  void parseTab;

  return (
    <div className="h-full w-full min-h-0 p-1">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="grid min-h-10 grid-cols-[1fr_auto] items-center border-b border-border bg-card px-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">Settings</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Docling</span>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="min-w-0 p-3">
          {selectedDoc ? (
            <div className="mb-3 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedDoc.doc_title || selectedDoc.source_uid}</span>
              <span className="mx-1.5 text-border">|</span>
              <span className="inline-flex translate-y-[1px]"><StatusBadge status={selectedDoc.status} /></span>
            </div>
          ) : (
            <div className="mb-3 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-muted-foreground">
              Select a file from the Parse list to inspect how these settings will apply to the active profile.
            </div>
          )}

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 text-sm font-bold text-foreground">Output Options</div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground">Markdown</span>
                <SettingSwitch label="Inline images in markdown" />

                <span className="pt-1 text-xs font-semibold text-foreground">Tables</span>
                <SettingSwitch label="Output tables as Markdown" />

                <span className="pt-1 text-xs font-semibold text-foreground">Images to Save</span>
                <SettingSwitch label="Embedded images" />
                <SettingSwitch label="Page screenshots" />
                <SettingSwitch label="Layout images" />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
