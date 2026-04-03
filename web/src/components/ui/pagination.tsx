import { Pagination as ArkPagination } from '@ark-ui/react/pagination';
import { cn } from '@/lib/utils';

function PaginationRoot({ className, ...props }: React.ComponentProps<typeof ArkPagination.Root>) {
  return (
    <ArkPagination.Root
      className={cn('flex flex-col gap-4', className)}
      data-slot="pagination"
      {...props}
    />
  );
}

function PaginationPrevTrigger({ className, ...props }: React.ComponentProps<typeof ArkPagination.PrevTrigger>) {
  return (
    <ArkPagination.PrevTrigger
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border bg-transparent px-2 h-9 text-sm font-medium text-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      data-slot="pagination-prev-trigger"
      {...props}
    />
  );
}

function PaginationNextTrigger({ className, ...props }: React.ComponentProps<typeof ArkPagination.NextTrigger>) {
  return (
    <ArkPagination.NextTrigger
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border bg-transparent px-2 h-9 text-sm font-medium text-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      data-slot="pagination-next-trigger"
      {...props}
    />
  );
}

function PaginationItem({ className, ...props }: React.ComponentProps<typeof ArkPagination.Item>) {
  return (
    <ArkPagination.Item
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border bg-transparent min-w-9 h-9 px-2 text-sm font-medium text-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[selected]:bg-primary data-[selected]:border-primary data-[selected]:text-primary-foreground',
        'disabled:opacity-50',
        className,
      )}
      data-slot="pagination-item"
      {...props}
    />
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<typeof ArkPagination.Ellipsis>) {
  return (
    <ArkPagination.Ellipsis
      className={cn('inline-flex items-center justify-center min-w-9 h-9 text-sm text-muted-foreground', className)}
      data-slot="pagination-ellipsis"
      {...props}
    />
  );
}

function PaginationContext(props: React.ComponentProps<typeof ArkPagination.Context>) {
  return <ArkPagination.Context {...props} />;
}

export {
  PaginationRoot,
  PaginationPrevTrigger,
  PaginationNextTrigger,
  PaginationItem,
  PaginationEllipsis,
  PaginationContext,
};
