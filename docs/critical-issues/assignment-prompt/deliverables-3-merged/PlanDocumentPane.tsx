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
};

const VIEW_MODE_OPTIONS = [
  { value: 'rich-text', label: 'Edit' },
  { value: 'preview', label: 'Preview' },
  { value: 'source', label: 'Source' },
  { value: 'diff', label: 'Diff' },
];

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
}: Props) {
  const title = artifact?.title ?? 'No artifact selected';
  const pathLabel = artifact?.path ?? '';
  const statusLabel = resolveStatusLabel({ hasDirectory, artifact, dirty });

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Document Workspace</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Open, review, and update tracker-managed Markdown artifacts
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenPlansDirectory}
          >
            {hasDirectory ? 'Reconnect Plans Directory' : 'Open Plans Directory'}
          </Button>
        </div>
      </div>

      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {pathLabel || statusLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
              disabled={!artifact || !dirty}
              onClick={onSave}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="mt-3">
          <SegmentedControl
            data={VIEW_MODE_OPTIONS}
            value={viewMode}
            size="sm"
            disabled={!artifact}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {!hasDirectory ? (
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Open the plans directory</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Connect the approved docs/plans directory to begin browsing lifecycle-grouped plan artifacts.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={onOpenPlansDirectory}
              >
                Open Plans Directory
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Loading workspace</p>
              <p className="mt-2 text-sm text-muted-foreground">
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
          <div className="flex h-full items-center justify-center px-6 py-6">
            <div className="w-full max-w-2xl rounded-xl border border-dashed border-border bg-card px-6 py-8 text-center">
              <p className="text-sm font-semibold text-foreground">Select a plan artifact</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose a plan or nested artifact from the lifecycle navigator to populate this document workspace.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
