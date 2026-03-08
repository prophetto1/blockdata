import { TreeView, createTreeCollection } from '@ark-ui/react/tree-view';
import { useMemo } from 'react';

export type HomeTreeNode = {
  id: string;
  name: string;
  href?: string;
  extension?: string;
  children?: HomeTreeNode[];
};

type KeystaticHomeRailProps = {
  treeRoot: HomeTreeNode;
};

export default function KeystaticHomeRail({ treeRoot }: KeystaticHomeRailProps) {
  const collection = useMemo(
    () =>
      createTreeCollection<HomeTreeNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode: treeRoot,
      }),
    [treeRoot]
  );

  const expandedValue = useMemo(
    () =>
      treeRoot.children
        ?.filter((node) => node.children?.length)
        .map((node) => node.id) ?? [],
    [treeRoot]
  );

  return (
    <TreeView.Root
      className="ks-tree"
      collection={collection}
      defaultExpandedValue={expandedValue}
    >
      <TreeView.Label className="ks-tree-label">Repo Mirror</TreeView.Label>

      <TreeView.Tree className="ks-tree-list">
        {collection.rootNode.children?.map((node, index) => (
          <TreeNode key={node.id} node={node} indexPath={[index]} />
        ))}
      </TreeView.Tree>
    </TreeView.Root>
  );
}

function TreeNode(props: TreeView.NodeProviderProps<HomeTreeNode>) {
  const { node, indexPath } = props;

  return (
    <TreeView.NodeProvider node={node} indexPath={indexPath}>
      <TreeView.NodeContext>
        {() =>
          node.children?.length ? (
            <TreeView.Branch className="ks-tree-branch">
              <TreeView.BranchControl className="ks-tree-branch-control">
                <TreeView.BranchTrigger className="ks-tree-branch-trigger">
                  <TreeView.BranchIndicator className="ks-tree-indicator">
                    &gt;
                  </TreeView.BranchIndicator>
                  <TreeView.BranchText className="ks-tree-text">
                    <span className="ks-tree-kind">dir</span>
                    <span className="ks-tree-name">{node.name}</span>
                  </TreeView.BranchText>
                </TreeView.BranchTrigger>
              </TreeView.BranchControl>

              <TreeView.BranchContent className="ks-tree-branch-content">
                <TreeView.BranchIndentGuide className="ks-tree-indent" />
                {node.children.map((child, index) => (
                  <TreeNode key={child.id} node={child} indexPath={[...indexPath, index]} />
                ))}
              </TreeView.BranchContent>
            </TreeView.Branch>
          ) : (
            <TreeView.Item className="ks-tree-item" asChild>
              <a
                href={node.href}
                target="keystatic-editor-frame"
                className="ks-tree-link"
              >
                <TreeView.ItemText className="ks-tree-text">
                  <span className="ks-tree-kind">
                    {node.extension === '.mdx' ? 'mdx' : 'md'}
                  </span>
                  <span className="ks-tree-name">{node.name}</span>
                </TreeView.ItemText>
              </a>
            </TreeView.Item>
          )
        }
      </TreeView.NodeContext>
    </TreeView.NodeProvider>
  );
}
