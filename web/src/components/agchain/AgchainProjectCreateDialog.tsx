import { useEffect, useState } from 'react';
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
import { type AgchainProjectCreateRequest } from '@/lib/agchainWorkspaces';

type ProjectDraft = {
  project_name: string;
  project_slug: string;
  description: string;
};

type AgchainProjectCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  error: string | null;
  onCreate: (payload: AgchainProjectCreateRequest) => Promise<void>;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

function createEmptyDraft(): ProjectDraft {
  return {
    project_name: '',
    project_slug: '',
    description: '',
  };
}

export function AgchainProjectCreateDialog({
  open,
  onOpenChange,
  creating,
  error,
  onCreate,
}: AgchainProjectCreateDialogProps) {
  const [draft, setDraft] = useState<ProjectDraft>(createEmptyDraft());

  useEffect(() => {
    if (!open) {
      setDraft(createEmptyDraft());
    }
  }, [open]);

  async function handleCreate() {
    await onCreate({
      project_name: draft.project_name,
      project_slug: draft.project_slug,
      description: draft.description,
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogTitle>Create Project</DialogTitle>
        <DialogDescription>
          Create an AGChain project workspace. This first pass still seeds an initial benchmark so the current
          definition workflow keeps working while benchmark remains a child resource under the project.
        </DialogDescription>
        <DialogBody>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="agchain-project-name">
                Project Name
              </label>
              <input
                id="agchain-project-name"
                className={inputClass}
                value={draft.project_name}
                onChange={(event) => setDraft({ ...draft, project_name: event.target.value })}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="agchain-project-slug">
                Project Slug
              </label>
              <input
                id="agchain-project-slug"
                className={inputClass}
                value={draft.project_slug}
                onChange={(event) => setDraft({ ...draft, project_slug: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="agchain-project-description">
                Description
              </label>
              <textarea
                id="agchain-project-description"
                className={`${inputClass} min-h-24`}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating || !draft.project_name.trim()}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
