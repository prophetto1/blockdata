import type { DragEvent } from 'react';
import { FLOW_NODE_KIND_MIME } from '@/components/flows/FlowCanvas';
import type { FlowNodeData } from '@/components/flows/FlowCanvas';

type WorkflowNodeKind = NonNullable<FlowNodeData['kind']>;

type PaletteItem = {
  kind: WorkflowNodeKind;
  letter: string;
  label: string;
  description: string;
};

const ITEMS: PaletteItem[] = [
  { kind: 'object', letter: 'O', label: 'Object', description: 'A target or subject the workflow shapes.' },
  { kind: 'skill',  letter: 'S', label: 'Skill',  description: 'A reusable action attached to an object.' },
  { kind: 'prompt', letter: 'P', label: 'Prompt', description: 'A prompt or invocation that drives a skill.' },
];

type WorkflowNodePaletteProps = {
  onAddNode: (kind: WorkflowNodeKind) => void;
};

export function WorkflowNodePalette({ onAddNode }: WorkflowNodePaletteProps) {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>, kind: WorkflowNodeKind) => {
    event.dataTransfer.setData(FLOW_NODE_KIND_MIME, kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="flex h-full w-[168px] flex-col gap-2 border-r border-border bg-card/60 p-3">
      <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Palette
      </div>
      {ITEMS.map((item) => (
        <button
          key={item.kind}
          type="button"
          draggable
          aria-label={`Add ${item.label}`}
          title={`Drag to canvas or click to add ${item.label}`}
          onClick={() => onAddNode(item.kind)}
          onDragStart={(event) => handleDragStart(event, item.kind)}
          className="group flex cursor-grab items-start gap-2 rounded-md border border-border bg-card p-2 text-left text-[11px] shadow-sm transition hover:border-foreground/40 hover:bg-accent active:cursor-grabbing"
        >
          <span
            aria-hidden
            className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md border border-border bg-background text-[11px] font-semibold text-foreground"
          >
            {item.letter}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold text-foreground">{item.label}</span>
            <span className="text-[10px] leading-snug text-muted-foreground">{item.description}</span>
          </span>
        </button>
      ))}
    </aside>
  );
}
