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
import { type AgchainBenchmarkCreateRequest } from '@/lib/agchainBenchmarks';

type BenchmarkDraft = {
  benchmark_name: string;
  benchmark_slug: string;
  description: string;
};

type AgchainProjectCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creating: boolean;
  error: string | null;
  onCreate: (payload: AgchainBenchmarkCreateRequest) => Promise<void>;
};

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

function createEmptyDraft(): BenchmarkDraft {
  return {
    benchmark_name: '',
    benchmark_slug: '',
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
  const [draft, setDraft] = useState<BenchmarkDraft>(createEmptyDraft());

  useEffect(() => {
    if (!open) {
      setDraft(createEmptyDraft());
    }
  }, [open]);

  async function handleCreate() {
    await onCreate({
      benchmark_name: draft.benchmark_name,
      benchmark_slug: draft.benchmark_slug,
      description: draft.description,
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={(details) => onOpenChange(details.open)}>
      <DialogContent>
        <DialogCloseTrigger />
        <DialogTitle>Create Project</DialogTitle>
        <DialogDescription>
          Create an AGChain project or evaluation backed by a benchmark identity, then enter its focused child pages.
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
                value={draft.benchmark_name}
                onChange={(event) => setDraft({ ...draft, benchmark_name: event.target.value })}
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
                value={draft.benchmark_slug}
                onChange={(event) => setDraft({ ...draft, benchmark_slug: event.target.value })}
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
            disabled={creating || !draft.benchmark_name.trim()}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
