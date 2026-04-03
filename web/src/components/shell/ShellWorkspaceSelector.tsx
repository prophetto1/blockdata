import { SegmentGroup } from '@ark-ui/react/segment-group';
import { useLocation, useNavigate } from 'react-router-dom';

const WORKSPACE_OPTIONS = [
  { label: 'Blockdata', value: 'blockdata', path: '/app' },
  { label: 'AG chain', value: 'agchain', path: '/app/agchain' },
] as const;

export function ShellWorkspaceSelector() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue = location.pathname.startsWith('/app/agchain')
    ? 'agchain'
    : 'blockdata';

  return (
    <SegmentGroup.Root
      value={currentValue}
      onValueChange={(details) => {
        const next = WORKSPACE_OPTIONS.find((o) => o.value === details.value);
        if (next && next.value !== currentValue) {
          navigate(next.path);
        }
      }}
      className="shell-workspace-toggle"
    >
      {WORKSPACE_OPTIONS.map((option) => (
        <SegmentGroup.Item
          key={option.value}
          value={option.value}
          className="shell-workspace-toggle-item"
        >
          <SegmentGroup.ItemText>{option.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemControl />
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
      <SegmentGroup.Indicator className="shell-workspace-toggle-indicator" />
    </SegmentGroup.Root>
  );
}