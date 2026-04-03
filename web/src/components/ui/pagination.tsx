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
        'inline-flex items-center justify-center rounded-md border border-[#3a3a3a] bg-transparent px-2 h-9 text-sm font-medium text-foreground',
        'hover:bg-white/5',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
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
        'inline-flex items-center justify-center rounded-md border border-[#3a3a3a] bg-transparent px-2 h-9 text-sm font-medium text-foreground',
        'hover:bg-white/5',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
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
        'inline-flex items-center justify-center rounded-md border border-[#3a3a3a] bg-transparent min-w-9 h-9 px-2 text-sm font-medium text-foreground',
        'hover:bg-white/5',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
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
