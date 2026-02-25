import * as React from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

type NativeSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: NativeSelectOption[];
  containerClassName?: string;
};

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, containerClassName, options, ...props }, ref) => (
    <div className={cn('relative inline-flex w-full items-center', containerClassName)}>
      <select
        ref={ref}
        className={cn(
          'h-8 w-full appearance-none rounded-md border border-border bg-card px-2 pr-7 text-xs text-foreground',
          'outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={14}
        stroke={2}
        className="pointer-events-none absolute right-2 text-muted-foreground"
        aria-hidden
      />
    </div>
  ),
);

NativeSelect.displayName = 'NativeSelect';

export { NativeSelect };
