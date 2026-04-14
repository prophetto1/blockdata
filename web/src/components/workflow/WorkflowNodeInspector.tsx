import type { ChangeEvent } from 'react';
import type { Node } from '@xyflow/react';
import type { FlowNodeData } from '@/components/flows/FlowCanvas';

type WorkflowNodeKind = NonNullable<FlowNodeData['kind']>;

type WorkflowNodeInspectorProps = {
  node: Node<FlowNodeData> | null;
  connectionCount: number;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onKindChange: (kind: WorkflowNodeKind) => void;
  onDelete: () => void;
};

export function WorkflowNodeInspector({
  node,
  connectionCount,
  onTitleChange,
  onBodyChange,
  onKindChange,
  onDelete,
}: WorkflowNodeInspectorProps) {
  return (
    <aside className="flex h-full w-[280px] flex-col gap-3 border-l border-border bg-card/60 p-3">
      <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Inspector
      </div>

      {node ? (
        <div className="flex flex-col gap-3 text-[11px]">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Title</span>
            <input
              value={node.data.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onTitleChange(event.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-foreground/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Type</span>
            <select
              value={node.data.kind ?? 'object'}
              onChange={(event: ChangeEvent<HTMLSelectElement>) => onKindChange(event.target.value as WorkflowNodeKind)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-foreground/40"
            >
              <option value="object">Object</option>
              <option value="skill">Skill</option>
              <option value="prompt">Prompt</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">Description</span>
            <textarea
              value={node.data.body}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onBodyChange(event.target.value)}
              rows={6}
              className="resize-none rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-foreground/40"
            />
          </label>

          <div className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 text-[10px] text-muted-foreground">
            <span>Connections</span>
            <strong className="text-[11px] text-foreground">{connectionCount}</strong>
          </div>

          <button
            type="button"
            onClick={onDelete}
            className="mt-auto inline-flex h-8 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-3 text-[11px] font-semibold text-destructive transition hover:bg-destructive/20"
          >
            Delete node
          </button>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
          Select a node to edit its title, type, and description.
        </div>
      )}
    </aside>
  );
}
