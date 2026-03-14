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
        blue: 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-500 dark:text-white',
        green: 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-500 dark:text-white',
        yellow: 'border-amber-700 bg-amber-700 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-white',
        red: 'border-red-700 bg-red-700 text-white dark:border-red-500 dark:bg-red-500 dark:text-white',
        teal: 'border-teal-700 bg-teal-700 text-white dark:border-teal-500 dark:bg-teal-500 dark:text-white',
        violet: 'border-violet-700 bg-violet-700 text-white dark:border-violet-500 dark:bg-violet-500 dark:text-white',
        orange: 'border-orange-800 bg-orange-800 text-white dark:border-orange-600 dark:bg-orange-600 dark:text-white',
        pink: 'border-pink-700 bg-pink-700 text-white dark:border-pink-500 dark:bg-pink-500 dark:text-white',
        grape: 'border-purple-800 bg-purple-800 text-white dark:border-purple-600 dark:bg-purple-600 dark:text-white',
        cyan: 'border-cyan-700 bg-cyan-700 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-white',
        indigo: 'border-indigo-700 bg-indigo-700 text-white dark:border-indigo-500 dark:bg-indigo-500 dark:text-white',
        lime: 'border-lime-800 bg-lime-800 text-white dark:border-lime-600 dark:bg-lime-600 dark:text-white',
        dark: 'border-zinc-800 bg-zinc-800 text-white dark:border-zinc-600 dark:bg-zinc-600 dark:text-white',
        gray: 'border-stone-700 bg-stone-700 text-white dark:border-stone-500 dark:bg-stone-500 dark:text-white',
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
