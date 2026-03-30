import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { type AgchainBenchmarkCreateRequest } from '@/lib/agchainBenchmarks';

type BenchmarkDraft = {
  benchmark_name: string;
  benchmark_slug: string;
  description: string;
};

type AgchainBenchmarksToolbarProps = {
  onCreate: (payload: AgchainBenchmarkCreateRequest) => Promise<unknown>;
  creating: boolean;
  error: string | null;
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

export function AgchainBenchmarksToolbar({
  onCreate,
  creating,
  error,
}: AgchainBenchmarksToolbarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<BenchmarkDraft>(createEmptyDraft());

  useEffect(() => {
    if (!createOpen) {
      setDraft(createEmptyDraft());
    }
  }, [createOpen]);

  async function handleCreate() {
    await onCreate({
      benchmark_name: draft.benchmark_name,
      benchmark_slug: draft.benchmark_slug,
      description: draft.description,
    });
    setCreateOpen(false);
  }

  return (
    <>
      <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Projects and evaluations</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              AGChain project registry backed by benchmark-derived rows. Create a project or evaluation here, then
              open its focused child pages across the shell.
            </p>
          </div>
          <div className="flex items-center">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New Project
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </section>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-xl" side="right">
          <SheetHeader>
            <SheetTitle>Create Project</SheetTitle>
            <SheetDescription>
              Create an AGChain project or evaluation backed by a benchmark identity, then enter its focused child
              pages.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="benchmark-name">
                Project Name
              </label>
              <input
                id="benchmark-name"
                className={inputClass}
                value={draft.benchmark_name}
                onChange={(event) => setDraft({ ...draft, benchmark_name: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="benchmark-slug">
                Project Slug
              </label>
              <input
                id="benchmark-slug"
                className={inputClass}
                value={draft.benchmark_slug}
                onChange={(event) => setDraft({ ...draft, benchmark_slug: event.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="benchmark-description">
                Description
              </label>
              <textarea
                id="benchmark-description"
                className={`${inputClass} min-h-24`}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </div>
          </div>

          <SheetFooter className="mt-8">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating || !draft.benchmark_name.trim()}
            >
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
