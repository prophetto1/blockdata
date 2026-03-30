import { useMemo } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjectFocus } from '@/hooks/useProjectFocus';
import { ProjectFocusSelectorPopover } from '@/components/shell/ProjectFocusSelectorPopover';

export function ProjectSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectOptions, resolvedProjectId, resolvedProjectName, setFocusedProjectId } = useProjectFocus();

  const displayLabel = resolvedProjectName ?? 'Select Project';
  const items = useMemo(
    () => projectOptions.map((project) => ({
      id: project.value,
      label: project.label,
      description: project.docCount > 0 ? `${project.docCount} docs` : 'No docs yet',
      searchText: project.label,
      leadingText: project.label[0]?.toUpperCase() ?? '?',
    })),
    [projectOptions],
  );

  return (
    <ProjectFocusSelectorPopover
      items={items}
      selectedItemId={resolvedProjectId}
      triggerLabel={displayLabel}
      searchPlaceholder="Find Project..."
      emptyLabel="No projects found"
      footerActionLabel="Create Project"
      footerActionHref="/app/projects/list?new=1"
      footerActionIcon={<IconPlus size={16} stroke={1.75} className="shrink-0 text-muted-foreground" />}
      onSelectItem={(projectId) => {
        setFocusedProjectId(projectId);
        if (location.pathname.startsWith('/app/elt')) {
          navigate(`/app/elt/${projectId}`);
        }
      }}
    />
  );
}

