import { useMemo, useState } from 'react';
import { IconChevronDown, IconPlus, IconSearch } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Popover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export function ProjectSwitcher() {
  const navigate = useNavigate();
  const { projectOptions, resolvedProjectId, resolvedProjectName, setFocusedProjectId } = useProjectFocus();
  const [search, setSearch] = useState('');

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projectOptions;
    return projectOptions.filter((p) => p.label.toLowerCase().includes(q));
  }, [projectOptions, search]);

  const displayLabel = resolvedProjectName ?? 'Select Project';

  return (
    <Popover.Root
      positioning={{ placement: 'bottom-start', offset: { mainAxis: 4 } }}
      onOpenChange={(details) => { if (!details.open) setSearch(''); }}
    >
      <Popover.Trigger
        className="project-switcher-trigger inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="max-w-[200px] truncate">{displayLabel}</span>
        <IconChevronDown size={16} stroke={1.75} className="shrink-0 text-muted-foreground" />
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner className="z-[140]">
          <Popover.Content className="relative z-[140] w-80 rounded-md border border-border bg-popover p-0 shadow-md outline-none">
            {/* Search input */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <IconSearch size={14} stroke={1.75} className="shrink-0 text-muted-foreground" />
              <input
                type="text"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder="Find Project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { e.stopPropagation(); }}
                autoFocus
              />
              <kbd className="text-[10px] text-muted-foreground">Esc</kbd>
            </div>

            {/* Project list */}
            <ScrollArea className="max-h-64" contentClass="py-1">
              {filteredProjects.map((project) => {
                const isActive = project.value === resolvedProjectId;
                const initial = project.label[0]?.toUpperCase() ?? '?';
                return (
                  <button
                    key={project.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent',
                      isActive && 'bg-accent',
                    )}
                    onClick={() => {
                      setFocusedProjectId(project.value);
                      navigate(`/app/elt/${project.value}`);
                    }}
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                      {initial}
                    </span>
                    <span className="truncate text-sm">{project.label}</span>
                  </button>
                );
              })}

              {filteredProjects.length === 0 && search && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  No projects found
                </div>
              )}
            </ScrollArea>

            {/* Create project */}
            <div className="border-t border-border py-1">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent"
                onClick={() => navigate('/app/projects/list?new=1')}
              >
                <IconPlus size={16} stroke={1.75} className="shrink-0 text-muted-foreground" />
                <span className="text-sm">Create Project</span>
              </button>
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
