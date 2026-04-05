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

export function PlanDocumentPane({
  artifact,
  content,
  diffMarkdown,
  fileKey,
  viewMode,
  dirty,
  hasDirectory,
  onChange,
  onSave,
  onOpenPlansDirectory,
}: Props) {
  const title = artifact?.title ?? 'No artifact selected';
  const pathLabel = artifact?.path ?? 'Choose a plan from the lifecycle navigator to open its controlling artifact.';

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Document Workspace</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              MDX-backed plan artifact editing, preview, and save surface
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
            <p className="mt-1 truncate text-xs text-muted-foreground">{pathLabel}</p>
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
              disabled={!artifact}
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
        {artifact ? (
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
              <p className="text-sm font-semibold text-foreground">Select a plan artifact to begin editing</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The document workspace stays visible before selection so the route reads as an MDX-backed editing surface.
              </p>
              {!hasDirectory ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Open the repository&apos;s <span className="font-mono">docs/plans</span> directory from the navigator to populate this workspace.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
