import { useMemo } from 'react';
import { Portal } from '@ark-ui/react/portal';
import { Select, createListCollection } from '@ark-ui/react/select';
import { IconChevronDown } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';

type WorkspaceOption = {
  label: string;
  value: string;
  path: string;
};

const WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata', value: 'blockdata', path: '/app' },
  { label: 'AG chain', value: 'agchain', path: '/app/agchain' },
];

export function ShellWorkspaceSelector() {
  const location = useLocation();
  const navigate = useNavigate();

  const collection = useMemo(
    () => createListCollection({ items: WORKSPACE_OPTIONS }),
    [],
  );

  const currentWorkspace = location.pathname.startsWith('/app/agchain')
    ? WORKSPACE_OPTIONS[1]
    : WORKSPACE_OPTIONS[0];

  return (
    <Select.Root
      collection={collection}
      positioning={{ placement: 'bottom-start', offset: { mainAxis: 6 } }}
      value={[currentWorkspace.value]}
      onValueChange={(details) => {
        const nextValue = details.value[0];
        const nextWorkspace = WORKSPACE_OPTIONS.find((item) => item.value === nextValue);
        if (nextWorkspace && nextWorkspace.path !== currentWorkspace.path) {
          navigate(nextWorkspace.path);
        }
      }}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger
          aria-label={`Workspace ${currentWorkspace.label}`}
          className="shell-workspace-selector-trigger"
        >
          <Select.ValueText placeholder={currentWorkspace.label} />
          <Select.Indicator>
            <IconChevronDown size={16} stroke={1.75} className="shrink-0 text-muted-foreground" />
          </Select.Indicator>
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner className="z-[140]">
          <Select.Content className="shell-workspace-selector-content">
            {collection.items.map((item) => (
              <Select.Item
                key={item.value}
                item={item}
                className="shell-workspace-selector-item"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
}
