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
  AgchainOrganizationMemberInvitationRequest,
  AgchainOrganizationMemberInvitationResult,
  AgchainPermissionGroupSummary,
} from '@/lib/agchainSettings';

type InviteOrganizationMembersModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  error: string | null;
  results: AgchainOrganizationMemberInvitationResult[];
  permissionGroups: AgchainPermissionGroupSummary[];
  onInvite: (payload: AgchainOrganizationMemberInvitationRequest) => Promise<void>;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

function parseEmails(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function outcomeLabel(outcome: AgchainOrganizationMemberInvitationResult['outcome']): string {
  switch (outcome) {
    case 'invite_created':
      return 'Invite created';
    case 'already_member':
      return 'Already a member';
    case 'already_pending':
      return 'Already pending';
    case 'invalid_email':
      return 'Invalid email';
  }
}

export function InviteOrganizationMembersModal({
  open,
  onOpenChange,
  creating,
  error,
  results,
  permissionGroups,
  onInvite,
}: InviteOrganizationMembersModalProps) {
  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      {open ? (
        <InviteOrganizationMembersModalContent
          creating={creating}
          error={error}
          results={results}
          permissionGroups={permissionGroups}
          onInvite={onInvite}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </DialogRoot>
  );
}

type InviteOrganizationMembersModalContentProps = Pick<
  InviteOrganizationMembersModalProps,
  'creating' | 'error' | 'results' | 'permissionGroups' | 'onInvite' | 'onOpenChange'
>;

function InviteOrganizationMembersModalContent({
  creating,
  error,
  results,
  permissionGroups,
  onInvite,
  onOpenChange,
}: InviteOrganizationMembersModalContentProps) {
  const [draftEmails, setDraftEmails] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasGroups = permissionGroups.length > 0;
  const parsedEmails = useMemo(() => parseEmails(draftEmails), [draftEmails]);

  function toggleGroup(permissionGroupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(permissionGroupId)
        ? current.filter((value) => value !== permissionGroupId)
        : [...current, permissionGroupId],
    );
  }

  async function handleInvite() {
    if (!parsedEmails.length) {
      setValidationError('Enter at least one email address.');
      return;
    }
    if (!selectedGroupIds.length) {
      setValidationError('Select at least one permission group.');
      return;
    }

    setValidationError(null);
    await onInvite({
      emails: parsedEmails,
      permission_group_ids: selectedGroupIds,
    });
  }

  return (
    <DialogContent className="w-[36rem] max-w-[calc(100vw-2rem)]">
      <DialogCloseTrigger />
      <DialogTitle>Invite Organization Members</DialogTitle>
      <DialogDescription>
        Create pending AGChain organization invites and assign permission groups during issuance. Email delivery is
        out of scope in this batch.
      </DialogDescription>
      <DialogBody>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="invite-organization-members-emails">
              Email Addresses
            </label>
            <textarea
              id="invite-organization-members-emails"
              className={`${inputClass} min-h-28`}
              value={draftEmails}
              onChange={(event) => setDraftEmails(event.target.value)}
              placeholder="person@example.com"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple addresses with new lines, commas, or spaces.
            </p>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-foreground">Permission Groups</legend>
            {hasGroups ? (
              <div className="grid gap-2 rounded-md border border-border/70 bg-card/60 p-3">
                {permissionGroups.map((group) => (
                  <div key={group.permission_group_id} className="flex items-center gap-3 text-sm text-foreground">
                    <CheckboxRoot
                      checked={selectedGroupIds.includes(group.permission_group_id)}
                      onCheckedChange={() => toggleGroup(group.permission_group_id)}
                    >
                      <CheckboxControl>
                        <CheckboxIndicator />
                      </CheckboxControl>
                      <CheckboxHiddenInput />
                    </CheckboxRoot>
                    <span>{group.name}</span>
                    {group.is_system_group ? (
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        System
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No permission groups are available yet for invite assignment.
              </p>
            )}
          </fieldset>
        </div>

        {validationError ? <p className="text-sm text-destructive">{validationError}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="rounded-md border border-border/70 bg-card/60 p-3 text-sm text-muted-foreground">
          Pending invite records were created in AGChain. Email delivery is out of scope in this batch.
        </div>

        {results.length ? (
          <div className="grid gap-2 rounded-md border border-border/70 bg-card/60 p-3">
            <h3 className="text-sm font-medium text-foreground">Latest batch outcomes</h3>
            <ul className="grid gap-2">
              {results.map((result) => (
                <li
                  key={`${result.email}-${result.outcome}`}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="text-foreground">{result.email}</span>
                  <span className="text-muted-foreground">{outcomeLabel(result.outcome)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" disabled={creating || !hasGroups} onClick={() => void handleInvite()}>
          {creating ? 'Creating...' : 'Create Invites'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
