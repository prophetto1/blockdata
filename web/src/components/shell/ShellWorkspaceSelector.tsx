import { Combobox, createListCollection } from '@ark-ui/react/combobox';
import { IconChevronDown } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminSurfaceAccessState } from '@/hooks/useAdminSurfaceAccess';

type WorkspaceValue = 'blockdata' | 'agchain' | 'blockdata-admin' | 'agchain-admin' | 'superuser';

type WorkspaceOption = {
  label: string;
  value: WorkspaceValue;
  path: string;
  adminKey?: 'blockdataAdmin' | 'agchainAdmin' | 'superuser';
};

const BASE_WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata', value: 'blockdata', path: '/app' },
  { label: 'AG chain', value: 'agchain', path: '/app/agchain' },
];

const ADMIN_WORKSPACE_OPTIONS: WorkspaceOption[] = [
  { label: 'Blockdata Admin', value: 'blockdata-admin', path: '/app/blockdata-admin', adminKey: 'blockdataAdmin' },
  { label: 'AGChain Admin', value: 'agchain-admin', path: '/app/agchain-admin', adminKey: 'agchainAdmin' },
  { label: 'Superuser', value: 'superuser', path: '/app/superuser', adminKey: 'superuser' },
];

const ADMIN_WORKSPACE_FALLBACKS: Record<Extract<WorkspaceValue, 'blockdata-admin' | 'agchain-admin' | 'superuser'>, Extract<WorkspaceValue, 'blockdata' | 'agchain'>> = {
  'blockdata-admin': 'blockdata',
  'agchain-admin': 'agchain',
  superuser: 'blockdata',
};

function isAdminWorkspaceValue(
  value: WorkspaceValue,
): value is Extract<WorkspaceValue, 'blockdata-admin' | 'agchain-admin' | 'superuser'> {
  return value in ADMIN_WORKSPACE_FALLBACKS;
}

export function ShellWorkspaceSelector() {
  const location = useLocation();
  const navigate = useNavigate();
  const { access, status } = useAdminSurfaceAccessState();

  const currentValue: WorkspaceValue = location.pathname.startsWith('/app/blockdata-admin')
    ? 'blockdata-admin'
    : location.pathname.startsWith('/app/agchain-admin')
      ? 'agchain-admin'
      : location.pathname.startsWith('/app/superuser')
    ? 'superuser'
    : location.pathname.startsWith('/app/agchain')
      ? 'agchain'
      : 'blockdata';

  const workspaceOptions = useMemo(() => (
    [
      ...BASE_WORKSPACE_OPTIONS,
      ...ADMIN_WORKSPACE_OPTIONS.filter((option) => (
        status === 'loading' || status === 'idle'
          ? option.value === currentValue
          : (option.adminKey ? Boolean(access?.[option.adminKey]) : false)
      )),
    ]
  ), [access, currentValue, status]);

  const selectedValue = useMemo<WorkspaceValue>(() => {
    if (!isAdminWorkspaceValue(currentValue)) return currentValue;
    if (workspaceOptions.some((option) => option.value === currentValue)) {
      return currentValue;
    }
    return ADMIN_WORKSPACE_FALLBACKS[currentValue];
  }, [currentValue, workspaceOptions]);

  const workspaceCollection = useMemo(
    () => createListCollection({ items: workspaceOptions }),
    [workspaceOptions],
  );

  const currentOption = workspaceOptions.find((option) => option.value === selectedValue);

  return (
    <Combobox.Root
      collection={workspaceCollection}
      value={[selectedValue]}
      inputValue={currentOption?.label ?? ''}
      onValueChange={(details) => {
        const nextValue = details.value[0] as WorkspaceValue | undefined;
        const next = workspaceOptions.find((option) => option.value === nextValue);
        if (next && next.path !== location.pathname && next.value !== selectedValue) {
          navigate(next.path);
        }
      }}
      closeOnSelect
      openOnClick
      selectionBehavior="preserve"
      positioning={{ placement: 'bottom-end', sameWidth: true, offset: { mainAxis: 6 } }}
      className="shell-workspace-selector"
    >
      <Combobox.Control className="shell-workspace-selector-control">
        <Combobox.Input
          aria-label="Workspace"
          className="shell-workspace-selector-input"
          placeholder="Select workspace"
          readOnly
          spellCheck={false}
        />
        <Combobox.Trigger
          aria-label="Open workspace selector"
          className="shell-workspace-selector-trigger"
        >
          <IconChevronDown size={14} stroke={1.8} />
        </Combobox.Trigger>
      </Combobox.Control>
      <Combobox.Positioner className="shell-workspace-selector-positioner">
        <Combobox.Content className="shell-workspace-selector-content">
          {workspaceOptions.map((option) => (
            <Combobox.Item
              key={option.value}
              item={option}
              className="shell-workspace-selector-item"
            >
              <Combobox.ItemText>{option.label}</Combobox.ItemText>
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
