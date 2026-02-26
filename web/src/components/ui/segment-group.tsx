import { SegmentGroup as ArkSegmentGroup } from '@ark-ui/react/segment-group';
import { cn } from '@/lib/utils';

function SegmentGroupRoot({
  className,
  ...props
}: ArkSegmentGroup.RootProps) {
  return (
    <ArkSegmentGroup.Root
      className={cn(
        'relative inline-flex items-center isolate rounded-md bg-muted p-0.5 ring-1 ring-inset ring-border',
        'data-[disabled]:opacity-50 data-[disabled]:grayscale',
        className,
      )}
      {...props}
    />
  );
}

function SegmentGroupIndicator({
  className,
  ...props
}: ArkSegmentGroup.IndicatorProps) {
  return (
    <ArkSegmentGroup.Indicator
      className={cn(
        'absolute z-0 rounded-sm bg-background shadow-sm',
        'transition-[width,height,left,top] duration-150 ease-out',
        className,
      )}
      {...props}
    />
  );
}

function SegmentGroupItem({
  className,
  ...props
}: ArkSegmentGroup.ItemProps) {
  return (
    <ArkSegmentGroup.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center justify-center rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground',
        'data-[state=checked]:text-foreground',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        'data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring data-[focus-visible]:outline-offset-2',
        className,
      )}
      {...props}
    />
  );
}

function SegmentGroupItemText({
  className,
  ...props
}: ArkSegmentGroup.ItemTextProps) {
  return (
    <ArkSegmentGroup.ItemText
      className={cn('relative z-[1]', className)}
      {...props}
    />
  );
}

const SegmentGroupItemControl = ArkSegmentGroup.ItemControl;
const SegmentGroupItemHiddenInput = ArkSegmentGroup.ItemHiddenInput;

export {
  SegmentGroupRoot,
  SegmentGroupIndicator,
  SegmentGroupItem,
  SegmentGroupItemText,
  SegmentGroupItemControl,
  SegmentGroupItemHiddenInput,
};
