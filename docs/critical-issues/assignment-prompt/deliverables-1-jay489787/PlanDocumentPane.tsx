import type { ReactNode } from 'react';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import type { PlanArtifactSummary } from './planTrackerModel';

type Props = {
  artifact: PlanArtifactSummary | null;
  hasDirectory: boolean;
  loading?: boolean;
  dirty?: boolean;
  documentContent: string;
  originalContent: string;
  fileKey: string;
  viewMode?: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  onOpenDirectory?: () => void;
};

type ModeButtonProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
};

function ModeButton({ label, active = false, disabled = true }: ModeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'rounded px-2 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function FrameMessage({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full items-center justify-center px-6 py-8">
      <div className="max-w-md space-y-3 text-center">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

function resolveFileLabel(artifact: PlanArtifactSummary | null) {
  if (!artifact) return 'No artifact selected';
  const parts = artifact.path.split('/');
  return parts[parts.length - 1] ?? artifact.title;
}

function resolveStatusLabel({
  hasDirectory,
  artifact,
  dirty,
}: {
  hasDirectory: boolean;
  artifact: PlanArtifactSummary | null;
  dirty?: boolean;
}) {
  if (!hasDirectory) return 'Directory not connected';
  if (!artifact) return 'Select a plan artifact to begin';
  if (dirty) return 'Unsaved changes';
  return 'Ready';
}

export function PlanDocumentPane({
  artifact,
  hasDirectory,
  loading = false,
  dirty = false,
  documentContent,
  originalContent,
  fileKey,
  viewMode = 'rich-text',
  onChange,
  onSave,
  onOpenDirectory,
}: Props) {
  const fileLabel = resolveFileLabel(artifact);
  const statusLabel = resolveStatusLabel({ hasDirectory, artifact, dirty });

  return (
    <div className="flex h-full min-h-0 flex-col bg-card" data-testid="plan-document-pane">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-foreground">Document Workspace</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Open, review, and update tracker-managed Markdown artifacts
        </div>
      </div>

      <div className="border-b border-border px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-mono text-xs text-foreground">{fileLabel}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{statusLabel}</div>
          </div>

          <button
            type="button"
            disabled={!artifact || !dirty || !onSave}
            onClick={onSave}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </div>

        <div className="mt-2 flex items-center gap-1 border-t border-border pt-2">
          <ModeButton label="Edit" active />
          <ModeButton label="Preview" />
          <ModeButton label="Source" disabled={viewMode !== 'source'} />
          <ModeButton label="Diff" disabled={viewMode !== 'diff'} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {!hasDirectory ? (
          <FrameMessage
            title="Open the plans directory"
            body="Connect the approved docs/plans directory to begin browsing lifecycle-grouped plan artifacts."
            action={
              onOpenDirectory ? (
                <button
                  type="button"
                  onClick={onOpenDirectory}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Open Plans Directory
                </button>
              ) : null
            }
          />
        ) : loading ? (
          <FrameMessage
            title="Loading workspace"
            body="Reading tracker artifacts and preparing the document workspace."
          />
        ) : !artifact ? (
          <FrameMessage
            title="Select a plan artifact"
            body="Choose a plan or nested artifact from the lifecycle navigator to populate this document workspace."
          />
        ) : (
          <MdxEditorSurface
            content={documentContent}
            diffMarkdown={originalContent}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={onChange}
            onSave={onSave}
          />
        )}
      </div>
    </div>
  );
}