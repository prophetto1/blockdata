import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  SegmentGroupIndicator,
  SegmentGroupItem,
  SegmentGroupItemHiddenInput,
  SegmentGroupItemText,
  SegmentGroupRoot,
} from '@/components/ui/segment-group';

type SegmentedControlSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type SegmentedControlDataItem = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type SegmentedControlProps = {
  className?: string;
  data: SegmentedControlDataItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: SegmentedControlSize;
  radius?: string | number;
  disabled?: boolean;
  name?: string;
};

const SIZE_CLASS_MAP: Record<SegmentedControlSize, string> = {
  xs: 'ui-segmented-control--xs',
  sm: 'ui-segmented-control--sm',
  md: 'ui-segmented-control--md',
  lg: 'ui-segmented-control--lg',
  xl: 'ui-segmented-control--xl',
};

function resolveRadius(radius?: string | number): string | undefined {
  if (radius === undefined) return undefined;
  if (typeof radius === 'number') return `${radius}px`;
  if (radius === 'xs') return '4px';
  if (radius === 'sm') return '6px';
  if (radius === 'md') return '8px';
  if (radius === 'lg') return '10px';
  if (radius === 'xl') return '12px';
  return radius;
}

function SegmentedControl({
  className,
  data,
  value,
  defaultValue,
  onChange,
  size = 'sm',
  radius,
  disabled,
  name,
}: SegmentedControlProps) {
  const radiusValue = resolveRadius(radius);

  return (
    <SegmentGroupRoot
      className={cn(
        'ui-segmented-control',
        SIZE_CLASS_MAP[size] ?? SIZE_CLASS_MAP.sm,
        className,
      )}
      style={radiusValue ? { borderRadius: radiusValue } : undefined}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(details) => {
        if (!details.value) return;
        onChange?.(details.value);
      }}
      disabled={disabled}
      name={name}
    >
      <SegmentGroupIndicator className="ui-segmented-control-indicator" />
      {data.map((item) => (
        <SegmentGroupItem
          key={item.value}
          value={item.value}
          className="ui-segmented-control-item"
          disabled={item.disabled}
        >
          <SegmentGroupItemText className="ui-segmented-control-label">
            {item.label}
          </SegmentGroupItemText>
          <SegmentGroupItemHiddenInput />
        </SegmentGroupItem>
      ))}
    </SegmentGroupRoot>
  );
}

export type {
  SegmentedControlDataItem,
  SegmentedControlProps,
  SegmentedControlSize,
};

export { SegmentedControl };
