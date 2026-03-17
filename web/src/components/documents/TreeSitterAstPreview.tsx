import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type AstNode = {
  type: string;
  start: [number, number];
  end: [number, number];
  text?: string;
  children?: AstNode[];
};

function AstNodeRow({ node, depth }: { node: AstNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const lineRange = `L${node.start[0] + 1}–${node.end[0] + 1}`;

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 py-0.5 text-xs font-mono w-full text-left',
          hasChildren ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default',
        )}
      >
        {hasChildren && (
          <span className="w-3 text-center text-muted-foreground">
            {expanded ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="font-semibold text-foreground">{node.type}</span>
        <span className="text-muted-foreground">{lineRange}</span>
        {node.text && (
          <span className="ml-2 truncate text-muted-foreground/70 max-w-[200px]">
            &quot;{node.text}&quot;
          </span>
        )}
      </button>
      {expanded && node.children?.map((child, i) => (
        <AstNodeRow key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function TreeSitterAstPreview({ jsonText }: { jsonText: string }) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(jsonText) as AstNode;
    } catch {
      return null;
    }
  }, [jsonText]);

  if (!parsed) {
    return <div className="p-4 text-xs text-muted-foreground">Invalid AST JSON</div>;
  }

  return (
    <div className="overflow-auto p-2">
      <AstNodeRow node={parsed} depth={0} />
    </div>
  );
}
