import { TreeView as ArkTreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import { cn } from '@/lib/utils';

export { createTreeCollection };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TreeViewRoot({ className, ...props }: React.ComponentProps<typeof ArkTreeView.Root<any>>) {
  return (
    <ArkTreeView.Root
      className={cn('flex w-full flex-col gap-2', className)}
      data-slot="tree-view"
      {...props}
    />
  );
}

function TreeViewLabel({ className, ...props }: React.ComponentProps<typeof ArkTreeView.Label>) {
  return (
    <ArkTreeView.Label
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="tree-view-label"
      {...props}
    />
  );
}

function TreeViewTree({ className, ...props }: React.ComponentProps<typeof ArkTreeView.Tree>) {
  return (
    <ArkTreeView.Tree
      className={cn('flex flex-col text-sm', className)}
      data-slot="tree-view-tree"
      {...props}
    />
  );
}

function TreeViewNodeProvider(props: React.ComponentProps<typeof ArkTreeView.NodeProvider>) {
  return <ArkTreeView.NodeProvider {...props} />;
}

function TreeViewNodeContext(props: React.ComponentProps<typeof ArkTreeView.NodeContext>) {
  return <ArkTreeView.NodeContext {...props} />;
}

function TreeViewBranch({ className, ...props }: React.ComponentProps<typeof ArkTreeView.Branch>) {
  return (
    <ArkTreeView.Branch
      className={cn('relative', className)}
      data-slot="tree-view-branch"
      {...props}
    />
  );
}

function TreeViewBranchControl({ className, ...props }: React.ComponentProps<typeof ArkTreeView.BranchControl>) {
  return (
    <ArkTreeView.BranchControl
      className={cn(
        'flex w-full items-center gap-2 rounded-md bg-transparent border-0 px-2 py-1 text-left text-foreground',
        'hover:bg-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[selected]:bg-accent data-[selected]:text-accent-foreground',
        className,
      )}
      data-slot="tree-view-branch-control"
      {...props}
    />
  );
}

function TreeViewBranchContent({ className, ...props }: React.ComponentProps<typeof ArkTreeView.BranchContent>) {
  return (
    <ArkTreeView.BranchContent
      className={cn(
        'relative',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      data-slot="tree-view-branch-content"
      {...props}
    />
  );
}

function TreeViewBranchIndicator({ className, ...props }: React.ComponentProps<typeof ArkTreeView.BranchIndicator>) {
  return (
    <ArkTreeView.BranchIndicator
      className={cn(
        'inline-flex items-center justify-center text-muted-foreground transition-transform duration-150',
        'data-[state=open]:rotate-90',
        className,
      )}
      data-slot="tree-view-branch-indicator"
      {...props}
    />
  );
}

function TreeViewBranchText({ className, ...props }: React.ComponentProps<typeof ArkTreeView.BranchText>) {
  return (
    <ArkTreeView.BranchText
      className={cn('flex-1 inline-flex items-center gap-2 truncate', className)}
      data-slot="tree-view-branch-text"
      {...props}
    />
  );
}

function TreeViewBranchIndentGuide({ className, ...props }: React.ComponentProps<typeof ArkTreeView.BranchIndentGuide>) {
  return (
    <ArkTreeView.BranchIndentGuide
      className={cn('absolute h-full w-px bg-border', className)}
      data-slot="tree-view-branch-indent-guide"
      {...props}
    />
  );
}

function TreeViewItem({ className, ...props }: React.ComponentProps<typeof ArkTreeView.Item>) {
  return (
    <ArkTreeView.Item
      className={cn(
        'flex w-full items-center gap-2 rounded-md bg-transparent border-0 px-2 py-1 text-left text-foreground',
        'hover:bg-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[selected]:bg-accent data-[selected]:text-accent-foreground',
        className,
      )}
      data-slot="tree-view-item"
      {...props}
    />
  );
}

function TreeViewItemText({ className, ...props }: React.ComponentProps<typeof ArkTreeView.ItemText>) {
  return (
    <ArkTreeView.ItemText
      className={cn('flex-1 inline-flex items-center gap-2 truncate', className)}
      data-slot="tree-view-item-text"
      {...props}
    />
  );
}

function TreeViewItemIndicator({ className, ...props }: React.ComponentProps<typeof ArkTreeView.ItemIndicator>) {
  return (
    <ArkTreeView.ItemIndicator
      className={cn('inline-flex items-center justify-center text-primary shrink-0', className)}
      data-slot="tree-view-item-indicator"
      {...props}
    />
  );
}

function TreeViewBranchTrigger({ className, ...props }: React.ComponentProps<typeof ArkTreeView.BranchTrigger>) {
  return (
    <ArkTreeView.BranchTrigger
      className={cn('flex min-w-0 flex-1 items-center gap-2 text-left', className)}
      data-slot="tree-view-branch-trigger"
      {...props}
    />
  );
}

function TreeViewContext(props: React.ComponentProps<typeof ArkTreeView.Context>) {
  return <ArkTreeView.Context {...props} />;
}

function TreeViewNodeRenameInput({ className, ...props }: React.ComponentProps<typeof ArkTreeView.NodeRenameInput>) {
  return (
    <ArkTreeView.NodeRenameInput
      className={cn(className)}
      data-slot="tree-view-node-rename-input"
      {...props}
    />
  );
}

type TreeViewNodeProviderProps<T> = React.ComponentProps<typeof ArkTreeView.NodeProvider> & { node: T; indexPath: number[] };

export type { TreeViewNodeProviderProps };
export {
  TreeViewRoot,
  TreeViewLabel,
  TreeViewTree,
  TreeViewNodeProvider,
  TreeViewNodeContext,
  TreeViewBranch,
  TreeViewBranchControl,
  TreeViewBranchContent,
  TreeViewBranchIndicator,
  TreeViewBranchText,
  TreeViewBranchIndentGuide,
  TreeViewItem,
  TreeViewItemText,
  TreeViewItemIndicator,
  TreeViewBranchTrigger,
  TreeViewContext,
  TreeViewNodeRenameInput,
};
