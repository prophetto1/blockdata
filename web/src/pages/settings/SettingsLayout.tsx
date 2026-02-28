import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TreeView, createTreeCollection, type TreeNode } from '@ark-ui/react/tree-view';
import { IconChevronRight } from '@tabler/icons-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { SETTINGS_TREE, type SettingsTreeNode } from './settings-nav';

type NavTreeNode = TreeNode & {
  id: string;
  label: string;
  path?: string;
  icon?: React.ComponentType<{ size?: number }>;
  children?: NavTreeNode[];
};

function toNavNodes(nodes: SettingsTreeNode[]): NavTreeNode[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.label,
    path: n.path,
    icon: n.icon,
    children: n.children ? toNavNodes(n.children) : undefined,
  }));
}

export default function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const treeCollection = useMemo(
    () =>
      createTreeCollection<NavTreeNode>({
        rootNode: {
          id: 'root',
          label: 'Root',
          children: toNavNodes(SETTINGS_TREE),
        },
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.label,
        nodeToChildren: (node) => node.children ?? [],
      }),
    [],
  );

  // Determine which leaf node is active based on current pathname
  const activeNodeId = useMemo(() => {
    for (const node of SETTINGS_TREE) {
      if (node.children) {
        for (const child of node.children) {
          if (child.path && location.pathname.startsWith(child.path)) return child.id;
        }
      }
      if (node.path && location.pathname.startsWith(node.path)) return node.id;
    }
    return null;
  }, [location.pathname]);

  // Auto-expand parent branches that contain the active node or whose own path is active
  const expandedIds = useMemo(() => {
    const ids: string[] = [];
    for (const node of SETTINGS_TREE) {
      if (node.children) {
        const selfActive = node.path && location.pathname.startsWith(node.path);
        const childActive = node.children.some(
          (c) => c.path && location.pathname.startsWith(c.path),
        );
        if (selfActive || childActive) ids.push(node.id);
      }
    }
    return ids;
  }, [location.pathname]);

  return (
    <>
      <PageHeader title="Settings" />

      <div className="flex h-[calc(100dvh-4.5rem)]">
        {/* Second rail */}
        <aside className="w-[250px] shrink-0 overflow-y-auto border-r border-border bg-card">
          <div className="px-4 pb-2 pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Settings
            </h2>
          </div>

          <TreeView.Root
            collection={treeCollection}
            selectionMode="single"
            selectedValue={activeNodeId ? [activeNodeId] : []}
            expandedValue={expandedIds}
            onSelectionChange={(details) => {
              const nextId = details.selectedValue[0];
              if (!nextId) return;
              const node = treeCollection.findNode(nextId);
              if (node?.path) navigate(node.path);
            }}
          >
            <TreeView.Tree className="px-2 pb-4">
              <TreeView.Context>
                {(tree) =>
                  tree.getVisibleNodes().map((entry) => {
                    const node = entry.node as NavTreeNode;
                    const indexPath = entry.indexPath;
                    if (node.id === 'root') return null;

                    return (
                      <TreeView.NodeProvider key={node.id} node={node} indexPath={indexPath}>
                        <TreeView.NodeContext>
                          {(state) => {
                            const depth = Math.max(0, indexPath.length - 1);
                            const paddingLeft = `${8 + depth * 16}px`;
                            const Icon = node.icon;
                            const isSelected = Boolean(state.selected);

                            if (state.isBranch) {
                              return (
                                <TreeView.Branch>
                                  <TreeView.BranchControl
                                    className={cn(
                                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                      'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                      isSelected && 'bg-accent text-accent-foreground',
                                    )}
                                    style={{ paddingLeft }}
                                  >
                                    <TreeView.BranchIndicator className="text-muted-foreground">
                                      <IconChevronRight size={14} className="transition-transform duration-150 data-[state=open]:rotate-90" />
                                    </TreeView.BranchIndicator>
                                    {Icon && <Icon size={16} />}
                                    <TreeView.BranchText className="truncate font-medium">
                                      {node.label}
                                    </TreeView.BranchText>
                                  </TreeView.BranchControl>
                                  <TreeView.BranchContent />
                                </TreeView.Branch>
                              );
                            }

                            return (
                              <TreeView.Item
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                  isSelected
                                    ? 'bg-primary/10 text-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                )}
                                style={{ paddingLeft }}
                              >
                                {Icon && <Icon size={16} />}
                                <TreeView.ItemText className="truncate">
                                  {node.label}
                                </TreeView.ItemText>
                              </TreeView.Item>
                            );
                          }}
                        </TreeView.NodeContext>
                      </TreeView.NodeProvider>
                    );
                  })
                }
              </TreeView.Context>
            </TreeView.Tree>
          </TreeView.Root>
        </aside>

        {/* Content area */}
        <section className="min-w-0 flex-1 overflow-y-auto p-6">
          <Outlet />
        </section>
      </div>
    </>
  );
}