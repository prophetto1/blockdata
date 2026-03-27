import { useCallback, useEffect, useState } from 'react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { SecretEditorDialog, type SecretEditorDraft } from '@/components/settings/SecretEditorDialog';
import { SecretsTable } from '@/components/settings/SecretsTable';
import {
  createSecret,
  deleteSecret,
  listSecrets,
  type SecretMetadata,
  type UpdateSecretInput,
  updateSecret,
} from '@/lib/secretsApi';
import { cn } from '@/lib/utils';
import { SettingsPageFrame } from './SettingsPageHeader';

type InlineStatus = {
  kind: 'success' | 'error';
  message: string;
};

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildUpdatePayload(secret: SecretMetadata, draft: SecretEditorDraft): UpdateSecretInput {
  const updates: UpdateSecretInput = {};
  const trimmedName = draft.name.trim();
  const nextDescription = draft.description.trim();

  if (trimmedName && trimmedName !== secret.name) {
    updates.name = trimmedName;
  }
  if (nextDescription !== (secret.description ?? '')) {
    updates.description = nextDescription;
  }
  if (draft.value_kind !== secret.value_kind) {
    updates.value_kind = draft.value_kind;
  }
  if (draft.value.trim()) {
    updates.value = draft.value;
  }

  return updates;
}

export default function SettingsSecrets() {
  useShellHeaderTitle({ title: 'Secrets', breadcrumbs: ['Settings', 'Secrets'] });

  const [secrets, setSecrets] = useState<SecretMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InlineStatus | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretMetadata | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSecrets = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      setSecrets(await listSecrets());
    } catch (error) {
      setStatus({ kind: 'error', message: formatError(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSecrets(true);
  }, [loadSecrets]);

  const handleCreate = () => {
    setEditingSecret(null);
    setEditorOpen(true);
    setStatus(null);
  };

  const handleEdit = (secret: SecretMetadata) => {
    setEditingSecret(secret);
    setEditorOpen(true);
    setStatus(null);
  };

  const handleCloseEditor = () => {
    if (submitting) return;
    setEditorOpen(false);
    setEditingSecret(null);
  };

  const handleSubmit = async (draft: SecretEditorDraft) => {
    setStatus(null);
    setSubmitting(true);

    try {
      if (editingSecret) {
        const updates = buildUpdatePayload(editingSecret, draft);
        if (Object.keys(updates).length > 0) {
          await updateSecret(editingSecret.id, updates);
          setStatus({
            kind: 'success',
            message: `${draft.name.trim() || editingSecret.name} updated.`,
          });
        }
      } else {
        await createSecret({
          name: draft.name.trim(),
          value: draft.value,
          description: draft.description.trim() || undefined,
          value_kind: draft.value_kind,
        });
        setStatus({
          kind: 'success',
          message: `${draft.name.trim().toUpperCase()} created.`,
        });
      }

      setEditorOpen(false);
      setEditingSecret(null);
      await loadSecrets();
    } catch (error) {
      setStatus({ kind: 'error', message: formatError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (secret: SecretMetadata) => {
    setStatus(null);
    setDeletingId(secret.id);
    try {
      await deleteSecret(secret.id);
      setStatus({ kind: 'success', message: `${secret.name} deleted.` });
      await loadSecrets();
    } catch (error) {
      setStatus({ kind: 'error', message: formatError(error) });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <SettingsPageFrame
        title="Secrets"
        description="Manage sensitive values and credentials used across your workspace. Plaintext values are write-only."
        headerAction={(
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={handleCreate}
          >
            New Secret
          </button>
        )}
      >
        {status && (
          <div
            className={cn(
              'mb-4 rounded-md border px-3 py-2 text-sm',
              status.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
            )}
            role="status"
          >
            {status.message}
          </div>
        )}

        <SecretsTable
          secrets={secrets}
          loading={loading}
          deletingId={deletingId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </SettingsPageFrame>

      <SecretEditorDialog
        open={editorOpen}
        secret={editingSecret}
        submitting={submitting}
        onClose={handleCloseEditor}
        onSubmit={handleSubmit}
      />
    </>
  );
}
