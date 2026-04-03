import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { AgchainToolDetailResponse, AgchainToolSourceKind } from '@/lib/agchainTools';
import type { SecretMetadata } from '@/lib/secretsApi';
import { AgchainToolSourceEditor, type AgchainToolEditorState } from './AgchainToolSourceEditor';

const fieldClass = 'grid gap-1.5 text-sm text-foreground';
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
const textAreaClass =
  'min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

type AgchainToolEditorDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  detail: AgchainToolDetailResponse | null;
  sourceKindOptions: Array<Exclude<AgchainToolSourceKind, 'builtin'>>;
  secrets: SecretMetadata[];
  submitting: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: AgchainToolEditorState) => Promise<void>;
};

function createEmptyDraft(
  sourceKind: Exclude<AgchainToolSourceKind, 'builtin'> = 'custom',
): AgchainToolEditorState {
  return {
    sourceKind,
    toolName: '',
    displayName: '',
    description: '',
    approvalMode: 'manual',
    versionLabel: 'v1',
    parallelCallsAllowed: false,
    implementationKind: 'python_callable',
    implementationRef: '',
    bridgeName: '',
    transportType: 'stdio',
    command: '',
    url: '',
  };
}

function buildDraftFromDetail(detail: AgchainToolDetailResponse | null): AgchainToolEditorState {
  if (!detail) {
    return createEmptyDraft();
  }

  const config = detail.latest_version?.tool_config_jsonb ?? {};
  const sourceKind = detail.tool.source_kind;
  return {
    sourceKind,
    toolName: detail.tool.tool_name,
    displayName: detail.tool.display_name,
    description: detail.tool.description,
    approvalMode: detail.tool.approval_mode,
    versionLabel: detail.latest_version?.version_label ?? 'v1',
    parallelCallsAllowed: detail.latest_version?.parallel_calls_allowed ?? false,
    implementationKind: String(config.implementation_kind ?? 'python_callable'),
    implementationRef: String(config.implementation_ref ?? ''),
    bridgeName: String(config.bridge_name ?? ''),
    transportType: String(config.transport_type ?? 'stdio'),
    command: String(config.command ?? ''),
    url: String(config.url ?? ''),
  };
}

export function AgchainToolEditorDialog({
  open,
  mode,
  detail,
  sourceKindOptions,
  secrets,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: AgchainToolEditorDialogProps) {
  const title = mode === 'edit' ? 'Edit Tool' : 'Create Tool';
  const description =
    mode === 'edit'
      ? 'Update tool metadata and the latest editable version definition.'
      : 'Register a project-owned tool definition and create its first draft version.';

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open ? (
        <AgchainToolEditorDialogContent
          key={`${mode}:${detail?.tool.tool_id ?? 'create'}:${sourceKindOptions.join('|')}`}
          mode={mode}
          detail={detail}
          sourceKindOptions={sourceKindOptions}
          secrets={secrets}
          submitting={submitting}
          error={error}
          onOpenChange={onOpenChange}
          onSubmit={onSubmit}
          title={title}
          description={description}
        />
      ) : null}
    </DialogRoot>
  );
}

type AgchainToolEditorDialogContentProps = Pick<
  AgchainToolEditorDialogProps,
  'mode' | 'detail' | 'sourceKindOptions' | 'secrets' | 'submitting' | 'error' | 'onOpenChange' | 'onSubmit'
> & {
  title: string;
  description: string;
};

function AgchainToolEditorDialogContent({
  mode,
  detail,
  sourceKindOptions,
  secrets,
  submitting,
  error,
  onOpenChange,
  onSubmit,
  title,
  description,
}: AgchainToolEditorDialogContentProps) {
  const [draft, setDraft] = useState<AgchainToolEditorState>(() =>
    mode === 'edit' ? buildDraftFromDetail(detail) : createEmptyDraft(sourceKindOptions[0] ?? 'custom'),
  );

  const submitDisabled = useMemo(() => {
    if (!draft.toolName.trim() || !draft.displayName.trim()) {
      return true;
    }
    if (draft.sourceKind === 'custom' || draft.sourceKind === 'bridged') {
      return !draft.implementationRef.trim();
    }
    if (draft.transportType === 'stdio') {
      return !draft.command.trim();
    }
    return !draft.url.trim();
  }, [draft]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      ...draft,
      toolName: draft.toolName.trim(),
      displayName: draft.displayName.trim(),
      description: draft.description.trim(),
      implementationRef: draft.implementationRef.trim(),
      bridgeName: draft.bridgeName.trim(),
      command: draft.command.trim(),
      url: draft.url.trim(),
    });
  }

  return (
    <DialogContent className="w-[720px] max-w-[calc(100vw-2rem)]">
      <DialogCloseTrigger />
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <form onSubmit={handleSubmit}>
        <DialogBody>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="agchain-tool-name">Tool name</label>
              <Input
                id="agchain-tool-name"
                value={draft.toolName}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, toolName: value }));
                }}
                autoFocus
              />
            </div>
            <div className={fieldClass}>
              <label htmlFor="agchain-tool-display-name">Display name</label>
              <Input
                id="agchain-tool-display-name"
                value={draft.displayName}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, displayName: value }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={fieldClass}>
              <label htmlFor="agchain-tool-source-kind">Source kind</label>
              <select
                id="agchain-tool-source-kind"
                className={selectClass}
                value={draft.sourceKind}
                onChange={(event) => {
                  const value = event.currentTarget.value as Exclude<AgchainToolSourceKind, 'builtin'>;
                  setDraft((current) => ({
                    ...current,
                    sourceKind: value,
                  }));
                }}
              >
                {sourceKindOptions.map((sourceKind) => (
                  <option key={sourceKind} value={sourceKind}>
                    {sourceKind}
                  </option>
                ))}
              </select>
            </div>
            <div className={fieldClass}>
              <label htmlFor="agchain-tool-approval-mode">Approval mode</label>
              <select
                id="agchain-tool-approval-mode"
                className={selectClass}
                value={draft.approvalMode}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, approvalMode: value }));
                }}
              >
                <option value="manual">manual</option>
                <option value="auto">auto</option>
              </select>
            </div>
          </div>

          <div className={fieldClass}>
            <label htmlFor="agchain-tool-description">Description</label>
            <textarea
              id="agchain-tool-description"
              className={textAreaClass}
              value={draft.description}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((current) => ({ ...current, description: value }));
              }}
            />
          </div>

          <AgchainToolSourceEditor draft={draft} onChange={(updates) => setDraft((current) => ({ ...current, ...updates }))} />

          <section className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-foreground">Available secrets</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reuse existing secret names when you add secret-slot metadata to a tool definition.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {secrets.length === 0 ? (
                <span className="text-sm text-muted-foreground">No secrets available.</span>
              ) : (
                secrets.map((secret) => (
                  <span
                    key={secret.id}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {secret.name}
                  </span>
                ))
              )}
            </div>
          </section>

          {error ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || submitDisabled}>
            {submitting ? (mode === 'edit' ? 'Saving...' : 'Creating...') : mode === 'edit' ? 'Save changes' : 'Create tool'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
