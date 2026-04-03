import { useMemo } from 'react';
import { useAgchainProjectFocus } from '@/hooks/agchain/useAgchainProjectFocus';
import { ProjectFocusSelectorPopover } from '@/components/shell/ProjectFocusSelectorPopover';

export function AgchainProjectSwitcher() {
  const {
    items,
    loading,
    error,
    focusedProject,
    focusedProjectSlug,
    setFocusedProjectSlug,
    reload,
  } = useAgchainProjectFocus();

  const selectorItems = useMemo(
    () => items.map((item) => ({
      id: item.project_slug,
      label: item.project_name,
      description: item.description,
      searchText: `${item.project_slug} ${item.benchmark_slug ?? ''} ${item.description}`.trim(),
      leadingText: item.project_name[0]?.toUpperCase() ?? '?',
    })),
    [items],
  );

  const triggerLabel = focusedProject?.project_name
    ?? focusedProjectSlug
    ?? 'Select AGChain project';
  const triggerDescription = focusedProject?.description
    ?? (focusedProject?.benchmark_slug ? `Benchmark · ${focusedProject.benchmark_slug}` : null);
  const triggerLeadingText = focusedProject?.project_name[0]?.toUpperCase()
    ?? triggerLabel[0]?.toUpperCase()
    ?? '?';

  return (
    <ProjectFocusSelectorPopover
      items={selectorItems}
      selectedItemId={focusedProjectSlug}
      triggerLabel={triggerLabel}
      triggerDescription={triggerDescription}
      triggerLeadingText={triggerLeadingText}
      triggerVariant="sidebar-row"
      triggerTestId="agchain-project-context"
      triggerClassName="agchain-project-switcher-trigger"
      searchPlaceholder="Find project..."
      emptyLabel="No projects found"
      loadingLabel="Loading projects..."
      loading={loading}
      error={error}
      onRetry={reload}
      footerActionLabel="Create new project"
      footerActionHref="/app/agchain/projects?new=1"
      onSelectItem={(slug) => setFocusedProjectSlug(slug)}
    />
  );
}
