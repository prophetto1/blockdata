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
import { CheckboxRoot, CheckboxControl, CheckboxIndicator, CheckboxHiddenInput } from '@/components/ui/checkbox';
import type {
  AgchainPermissionDefinitionsResponse,
  AgchainPermissionGroupCreateRequest,
} from '@/lib/agchainSettings';

type CreatePermissionGroupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  error: string | null;
  definitions: AgchainPermissionDefinitionsResponse | null;
  onCreate: (payload: AgchainPermissionGroupCreateRequest) => Promise<void>;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

export function CreatePermissionGroupModal({
  open,
  onOpenChange,
  creating,
  error,
  definitions,
  onCreate,
}: CreatePermissionGroupModalProps) {
  return (
    <DialogRoot modal={false} open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open ? (
        <CreatePermissionGroupModalContent
          creating={creating}
          error={error}
          definitions={definitions}
          onCreate={onCreate}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </DialogRoot>
  );
}

type CreatePermissionGroupModalContentProps = Pick<
  CreatePermissionGroupModalProps,
  'creating' | 'error' | 'definitions' | 'onCreate' | 'onOpenChange'
>;

function CreatePermissionGroupModalContent({
  creating,
  error,
  definitions,
  onCreate,
  onOpenChange,
}: CreatePermissionGroupModalContentProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const organizationPermissions = useMemo(
    () => definitions?.organization_permissions.filter((permission) => permission.user_assignable) ?? [],
    [definitions],
  );

  function togglePermission(permissionKey: string) {
    setSelectedPermissionKeys((current) =>
      current.includes(permissionKey)
        ? current.filter((value) => value !== permissionKey)
        : [...current, permissionKey],
    );
  }

  async function handleCreate() {
    if (!name.trim()) {
      setValidationError('Enter a permission group name.');
      return;
    }
    if (!selectedPermissionKeys.length) {
      setValidationError('Select at least one organization permission.');
      return;
    }

    setValidationError(null);
    await onCreate({
      name: name.trim(),
      description: description.trim(),
      permission_keys: selectedPermissionKeys,
    });
  }

  return (
    <DialogContent className="w-[40rem] max-w-[calc(100vw-2rem)]">
      <DialogCloseTrigger />
      <DialogTitle>Create Permission Group</DialogTitle>
      <DialogDescription>
        Create a reusable organization-level permission bundle for AGChain members.
      </DialogDescription>
      <DialogBody>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="create-permission-group-name">
              Name
            </label>
            <input
              id="create-permission-group-name"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="create-permission-group-description">
              Description
            </label>
            <textarea
              id="create-permission-group-description"
              className={`${inputClass} min-h-24`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-foreground">Organization Permissions</legend>
            <div className="grid gap-2 rounded-md border border-border/70 bg-card/60 p-3">
              {organizationPermissions.map((permission) => (
                <div
                  key={permission.permission_key}
                  className="grid gap-1 rounded-md border border-border/50 bg-background/60 p-3"
                >
                  <span className="flex items-start gap-3">
                    <CheckboxRoot
                      checked={selectedPermissionKeys.includes(permission.permission_key)}
                      onCheckedChange={() => togglePermission(permission.permission_key)}
                    >
                      <CheckboxControl className="mt-0.5">
                        <CheckboxIndicator />
                      </CheckboxControl>
                      <CheckboxHiddenInput />
                    </CheckboxRoot>
                    <span className="grid gap-1">
                      <span className="text-sm font-medium text-foreground">{permission.label}</span>
                      <span className="text-xs leading-6 text-muted-foreground">{permission.description}</span>
                    </span>
                  </span>
                </div>
              ))}
              {!organizationPermissions.length ? (
                <p className="text-sm text-muted-foreground">
                  No user-assignable organization permissions are available.
                </p>
              ) : null}
            </div>
          </fieldset>
        </div>

        {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={creating || !organizationPermissions.length} onClick={() => void handleCreate()}>
          {creating ? 'Creating...' : 'Create Permission Group'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
