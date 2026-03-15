import type { ReactNode } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { StatusBadge } from '@/components/documents/StatusBadge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectDocumentRow } from '@/lib/projectDetailHelpers';
import { cn } from '@/lib/utils';
import { useParseTab } from './ParseTabPanel';

type ParseConfigColumnProps = {
  docs: ProjectDocumentRow[];
  selected: Set<string>;
  selectedDoc: ProjectDocumentRow | null;
  parseTab: ReturnType<typeof useParseTab>;
  onReset?: (uids: string[]) => void;
  onDelete?: (uids: string[]) => void;
};

function getProfileName(config: Record<string, unknown>): string {
  return typeof config.name === 'string' && config.name.trim().length > 0
    ? config.name
    : 'Unnamed profile';
}

function getProfileDescription(config: Record<string, unknown>): string | null {
  return typeof config.description === 'string' && config.description.trim().length > 0
    ? config.description
    : null;
}

function getPipelineLabel(config: Record<string, unknown>): string | null {
  return typeof config.pipeline === 'string' && config.pipeline.trim().length > 0
    ? config.pipeline
    : null;
}

function ActionButton({
  children,
  disabled,
  onClick,
  variant = 'secondary',
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md border px-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'secondary' && 'border-border bg-background text-foreground hover:bg-accent',
        variant === 'danger' && 'border-destructive/40 bg-background text-destructive hover:bg-destructive/10',
      )}
    >
      {children}
    </button>
  );
}

export function ParseConfigColumn({
  docs,
  selected,
  selectedDoc,
  parseTab,
  onReset,
  onDelete,
}: ParseConfigColumnProps) {
  const { profiles, selectedProfileId, handleProfileChange, batch } = parseTab;

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedProfileConfig = (selectedProfile?.config ?? {}) as Record<string, unknown>;
  const selectedProfileDescription = getProfileDescription(selectedProfileConfig);
  const pipelineLabel = getPipelineLabel(selectedProfileConfig);

  const unparsedUids = docs
    .filter((doc) => doc.status === 'uploaded' || doc.status === 'conversion_failed' || doc.status === 'parse_failed')
    .map((doc) => doc.source_uid);

  const selectedUids = docs
    .filter((doc) => selected.has(doc.source_uid))
    .map((doc) => doc.source_uid);

  const selectedResetableUids = docs
    .filter((doc) => selected.has(doc.source_uid) && (
      doc.status === 'parsed'
      || doc.status === 'converting'
      || doc.status === 'conversion_failed'
      || doc.status === 'parse_failed'
    ))
    .map((doc) => doc.source_uid);

  const allResetableUids = docs
    .filter((doc) => doc.status === 'parsed' || doc.status === 'conversion_failed' || doc.status === 'parse_failed')
    .map((doc) => doc.source_uid);

  const parsedCount = docs.filter((doc) => doc.status === 'parsed').length;
  const convertingCount = docs.filter((doc) => doc.status === 'converting').length;
  const parseProgress = docs.length > 0 ? (parsedCount / docs.length) * 100 : 0;

  return (
    <div className="h-full w-full min-h-0 p-1">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <div className="grid min-h-10 grid-cols-[1fr_auto] items-center border-b border-border bg-card px-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">Config</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Docling</span>
          </div>
          {batch.isRunning ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-[11px] font-medium text-orange-700 dark:text-orange-300">
              <IconLoader2 size={12} className="animate-spin" />
              Running
            </span>
          ) : null}
        </div>

        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-y-auto overflow-x-hidden" contentClass="min-w-0 p-3">
          <div className="mb-3 rounded-md border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-foreground">Progress</div>
              <div className="text-xs text-muted-foreground">
                {parsedCount}/{docs.length} parsed
              </div>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${parseProgress}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{unparsedUids.length} ready</span>
              <span>{selected.size} selected</span>
              {convertingCount > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <IconLoader2 size={12} className="animate-spin" />
                  {convertingCount} converting
                </span>
              ) : (
                <span>0 converting</span>
              )}
            </div>
          </div>

          {selectedDoc ? (
            <div className="mb-3 text-xs text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedDoc.doc_title || selectedDoc.source_uid}</span>
              <span className="mx-1.5 text-border">|</span>
              <span className="inline-flex translate-y-[1px]"><StatusBadge status={selectedDoc.status} /></span>
            </div>
          ) : (
            <div className="mb-3 text-xs text-muted-foreground">
              Select a file from the Parse list to inspect or run it with the active profile.
            </div>
          )}

          <div className="space-y-3">
            <div className="px-1 py-1">
              <div className="mb-2 text-sm font-bold text-foreground">Profile</div>
              <label className="mb-1 block text-xs font-medium text-foreground">Active profile</label>
              <select
                value={selectedProfileId}
                onChange={(event) => handleProfileChange(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getProfileName(profile.config as Record<string, unknown>)}
                  </option>
                ))}
              </select>
              {selectedProfile && (
                <div className="mt-3 border-t border-border/70 pt-3">
                  <div className="text-sm font-semibold text-foreground">
                    {getProfileName(selectedProfileConfig)}
                  </div>
                  {selectedProfileDescription ? (
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      {selectedProfileDescription}
                    </div>
                  ) : null}
                  {pipelineLabel ? (
                    <div className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      Pipeline: {pipelineLabel}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Runtime audit details — visible after conversion-complete sends them */}
              {selectedDoc?.parser_runtime_meta &&
                typeof selectedDoc.parser_runtime_meta === 'object' &&
                Object.keys(selectedDoc.parser_runtime_meta).length > 0 && (
                <div className="mt-3 space-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground/80">Applied Runtime</div>
                  {'parser_version' in selectedDoc.parser_runtime_meta && (
                    <div>Parser: {String(selectedDoc.parser_runtime_meta.parser_version)}</div>
                  )}
                  {'ocr_backend' in selectedDoc.parser_runtime_meta && (
                    <div>OCR: {String(selectedDoc.parser_runtime_meta.ocr_backend)}</div>
                  )}
                  {'vlm_model' in selectedDoc.parser_runtime_meta && (
                    <div>VLM: {String(selectedDoc.parser_runtime_meta.vlm_model)}</div>
                  )}
                  {selectedDoc.applied_pipeline_config &&
                    JSON.stringify(selectedDoc.applied_pipeline_config) !==
                      JSON.stringify(selectedDoc.requested_pipeline_config) && (
                    <div className="text-amber-500">
                      Applied config differs from requested config
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-1 py-1">
              <div className="mb-2 text-sm font-bold text-foreground">Batch actions</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <ActionButton
                  variant="primary"
                  disabled={unparsedUids.length === 0 || batch.isRunning || !selectedProfileId}
                  onClick={() => batch.start(unparsedUids)}
                >
                  Parse All ({unparsedUids.length})
                </ActionButton>
                <ActionButton
                  disabled={selectedUids.length === 0 || batch.isRunning || !selectedProfileId}
                  onClick={() => batch.start(selectedUids)}
                >
                  Parse Selected ({selectedUids.length})
                </ActionButton>
                <ActionButton
                  disabled={!onReset || selectedResetableUids.length === 0}
                  onClick={() => onReset?.(selectedResetableUids)}
                >
                  Reset ({selectedResetableUids.length})
                </ActionButton>
                <ActionButton
                  disabled={!onReset || allResetableUids.length === 0}
                  onClick={() => onReset?.(allResetableUids)}
                >
                  Reset All ({allResetableUids.length})
                </ActionButton>
                <ActionButton
                  variant="danger"
                  disabled={!onDelete || selected.size === 0}
                  onClick={() => onDelete?.(Array.from(selected))}
                >
                  Delete ({selected.size})
                </ActionButton>
                <ActionButton
                  variant="danger"
                  disabled={!batch.isRunning}
                  onClick={batch.cancel}
                >
                  Cancel
                </ActionButton>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
