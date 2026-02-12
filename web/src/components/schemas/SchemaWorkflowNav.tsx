import { Button, Card, Group } from '@mantine/core';
import { useLocation, useNavigate } from 'react-router-dom';

type WorkflowKey = 'start' | 'wizard' | 'advanced' | 'templates' | 'apply';

type WorkflowItem = {
  key: WorkflowKey;
  label: string;
  path: string;
};

const WORKFLOW_ITEMS: WorkflowItem[] = [
  { key: 'start', label: 'Start', path: '/app/schemas/start' },
  { key: 'wizard', label: 'Wizard', path: '/app/schemas/wizard' },
  { key: 'advanced', label: 'Advanced', path: '/app/schemas/advanced' },
  { key: 'templates', label: 'Templates', path: '/app/schemas/templates' },
  { key: 'apply', label: 'Apply', path: '/app/schemas/apply' },
];

function getActiveWorkflow(pathname: string): WorkflowKey | null {
  if (pathname.startsWith('/app/schemas/templates')) return 'templates';
  if (pathname.startsWith('/app/schemas/wizard')) return 'wizard';
  if (pathname.startsWith('/app/schemas/advanced')) return 'advanced';
  if (pathname.startsWith('/app/schemas/apply')) return 'apply';
  if (pathname.startsWith('/app/schemas/start')) return 'start';
  return null;
}

type SchemaWorkflowNavProps = {
  includeTemplates?: boolean;
  includeApply?: boolean;
};

export function SchemaWorkflowNav({ includeTemplates = true, includeApply = true }: SchemaWorkflowNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const active = getActiveWorkflow(location.pathname);

  const items = WORKFLOW_ITEMS.filter((item) => {
    if (!includeTemplates && item.key === 'templates') return false;
    if (!includeApply && item.key === 'apply') return false;
    return true;
  });

  return (
    <Card withBorder padding="sm" mb="md">
      <Group gap="xs" wrap="wrap">
        {items.map((item) => (
          <Button
            key={item.key}
            size="xs"
            variant={active === item.key ? 'filled' : 'light'}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </Button>
        ))}
      </Group>
    </Card>
  );
}

