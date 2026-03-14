import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        blue: 'border-transparent bg-blue-200 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200',
        green: 'border-transparent bg-green-200 text-green-900 dark:bg-green-900/40 dark:text-green-200',
        yellow: 'border-transparent bg-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200',
        red: 'border-transparent bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-200',
        teal: 'border-transparent bg-teal-200 text-teal-900 dark:bg-teal-900/40 dark:text-teal-200',
        violet: 'border-transparent bg-violet-200 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200',
        orange: 'border-transparent bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200',
        pink: 'border-transparent bg-pink-200 text-pink-900 dark:bg-pink-900/40 dark:text-pink-200',
        grape: 'border-transparent bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200',
        cyan: 'border-transparent bg-cyan-200 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-200',
        indigo: 'border-transparent bg-indigo-200 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200',
        lime: 'border-transparent bg-lime-200 text-lime-900 dark:bg-lime-900/40 dark:text-lime-200',
        dark: 'border-transparent bg-zinc-300 text-zinc-900 dark:bg-zinc-700/50 dark:text-zinc-200',
        gray: 'border-transparent bg-stone-200 text-stone-800 dark:bg-stone-700/50 dark:text-stone-200',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        xs: 'px-1.5 py-px text-[10px]',
        sm: 'px-2 py-0.5 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
