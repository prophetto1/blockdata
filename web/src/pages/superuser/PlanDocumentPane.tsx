import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import type { PlanArtifactSummary } from './planTrackerModel';

type Props = {
  artifact: PlanArtifactSummary | null;
  content: string;
  diffMarkdown: string;
  fileKey: string;
  viewMode: MdxViewMode;
  dirty: boolean;
  hasDirectory: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onOpenPlansDirectory: () => void;
  onViewModeChange: (mode: MdxViewMode) => void;
};

function resolveStatusLabel({
  hasDirectory,
  artifact,
  dirty,
}: {
  hasDirectory: boolean;
  artifact: PlanArtifactSummary | null;
  dirty: boolean;
}) {
  if (!hasDirectory) return 'Directory not connected';
  if (!artifact) return 'Select a plan artifact to begin';
  if (dirty) return 'Unsaved changes';
  return 'Ready';
}

function resolveConnectionLine({
  hasDirectory,
  artifact,
}: {
  hasDirectory: boolean;
  artifact: PlanArtifactSummary | null;
}) {
  if (!hasDirectory) return 'Directory not connected.';
  if (artifact?.path) return artifact.path;
  return 'Connected to docs/plans. Select a plan artifact.';
}

const VIEW_MODE_OPTIONS: Array<{ value: MdxViewMode; label: string }> = [
  { value: 'rich-text', label: 'Edit' },
  { value: 'source', label: 'Source' },
  { value: 'diff', label: 'Diff' },
];

export function PlanDocumentPane({
  artifact,
  content,
  diffMarkdown,
  fileKey,
  viewMode,
  dirty,
  hasDirectory,
  loading = false,
  onChange,
  onSave,
  onOpenPlansDirectory,
  onViewModeChange,
}: Props) {
  const title = artifact?.title ?? 'No artifact selected';
  const statusLabel = resolveStatusLabel({ hasDirectory, artifact, dirty });
  const connectionLine = resolveConnectionLine({ hasDirectory, artifact });
  const directoryActionLabel = hasDirectory ? 'Reconnect' : 'Connect';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Document Workspace
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{connectionLine}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onOpenPlansDirectory}>
            {directoryActionLabel}
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{statusLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={dirty ? 'default' : 'outline'} size="sm">
              {dirty ? 'Unsaved' : artifact ? 'Saved' : 'Idle'}
            </Badge>
            <Badge variant="outline" size="sm">
              {artifact?.artifactType ?? 'artifact pending'}
            </Badge>
            <Badge variant="outline" size="sm">
              {artifact ? `v${artifact.version}` : 'version pending'}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!artifact}
              onClick={onSave}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="mt-2">
          <SegmentedControl
            data={VIEW_MODE_OPTIONS}
            value={viewMode}
            size="sm"
            disabled={!artifact}
            onChange={(value) => {
              if (value === 'rich-text' || value === 'source' || value === 'diff') {
                onViewModeChange(value);
              }
            }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {!hasDirectory ? (
          <div className="flex h-full items-center justify-center px-5 py-5">
            <div className="w-full max-w-xl rounded-xl border border-dashed border-border bg-card px-5 py-6 text-center">
              <p className="text-sm font-semibold text-foreground">Directory not connected</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Use the status rail above to connect the approved docs/plans directory.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center px-5 py-5">
            <div className="w-full max-w-xl rounded-xl border border-dashed border-border bg-card px-5 py-6 text-center">
              <p className="text-sm font-semibold text-foreground">Loading workspace</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Reading tracker artifacts and preparing the document workspace.
              </p>
            </div>
          </div>
        ) : artifact ? (
          <MdxEditorSurface
            content={content}
            diffMarkdown={diffMarkdown}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={onChange}
            onSave={onSave}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-5 py-5">
            <div className="w-full max-w-xl rounded-xl border border-dashed border-border bg-card px-5 py-6 text-center">
              <p className="text-sm font-semibold text-foreground">Select a plan artifact</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Choose a plan or nested artifact from the lifecycle navigator to populate this document workspace.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
