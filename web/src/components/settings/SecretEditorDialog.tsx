import { useEffect, useId, useState, type FormEvent } from 'react';
import type { SecretMetadata, SecretValueKind } from '@/lib/secretsApi';
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog';

export type SecretEditorDraft = {
  name: string;
  description: string;
  value: string;
  value_kind: SecretValueKind;
};

type SecretEditorDialogProps = {
  open: boolean;
  secret: SecretMetadata | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (draft: SecretEditorDraft) => Promise<void> | void;
};

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const textAreaClass =
  'min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function buildDraft(secret: SecretMetadata | null): SecretEditorDraft {
  return {
    name: secret?.name ?? '',
    description: secret?.description ?? '',
    value: '',
    value_kind: secret?.value_kind ?? 'secret',
  };
}

export function SecretEditorDialog({
  open,
  secret,
  submitting,
  onClose,
  onSubmit,
}: SecretEditorDialogProps) {
  const [draft, setDraft] = useState<SecretEditorDraft>(() => buildDraft(secret));
  const nameId = useId();
  const kindId = useId();
  const descriptionId = useId();
  const valueId = useId();

  useEffect(() => {
    if (!open) return;
    setDraft(buildDraft(secret));
  }, [open, secret]);

  const isEditing = Boolean(secret);
  const actionLabel = isEditing ? 'Save Changes' : 'Create Secret';
  const description = isEditing
    ? 'Update secret metadata or rotate the stored value. Leave Value blank to keep the current secret value.'
    : 'Create a new user-scoped secret. Plaintext values are write-only and never returned by the API.';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      value: draft.value,
    });
  };

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open && !submitting) onClose();
      }}
    >
      <DialogContent className="w-[640px] max-w-[calc(100vw-2rem)]">
        <DialogCloseTrigger />
        <DialogTitle>{isEditing ? 'Edit Secret' : 'New Secret'}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="grid gap-1.5 text-sm text-foreground">
              <label htmlFor={nameId}>Name</label>
              <input
                id={nameId}
                className={inputClass}
                value={draft.name}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, name: value }));
                }}
                required
              />
            </div>

            <div className="grid gap-1.5 text-sm text-foreground">
              <label htmlFor={kindId}>Value Type</label>
              <select
                id={kindId}
                className={inputClass}
                value={draft.value_kind}
                onChange={(event) => {
                  const value = event.currentTarget.value as SecretValueKind;
                  setDraft((current) => ({
                    ...current,
                    value_kind: value,
                  }));
                }}
              >
                <option value="secret">secret</option>
                <option value="token">token</option>
                <option value="api_key">api_key</option>
                <option value="client_secret">client_secret</option>
                <option value="webhook_secret">webhook_secret</option>
              </select>
            </div>

            <div className="grid gap-1.5 text-sm text-foreground">
              <label htmlFor={descriptionId}>Description</label>
              <input
                id={descriptionId}
                className={inputClass}
                value={draft.description}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, description: value }));
                }}
              />
            </div>

            <div className="grid gap-1.5 text-sm text-foreground">
              <label htmlFor={valueId}>Value</label>
              <textarea
                id={valueId}
                className={textAreaClass}
                value={draft.value}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft((current) => ({ ...current, value }));
                }}
                placeholder={isEditing ? 'Leave blank to keep the current value' : 'Paste the secret value'}
                required={!isEditing}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <button
              type="button"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : actionLabel}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
