import { useState } from 'react';
import { IconPlus, IconX, IconChevronDown, IconChevronRight, IconGripVertical } from '@tabler/icons-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FlowTask } from '../flow-document';

type Props = {
  tasks: FlowTask[];
  updateTask: (index: number, patch: Partial<FlowTask>) => void;
  addTask: (task: FlowTask) => void;
  removeTask: (index: number) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
};

function shortType(type: string): string {
  const parts = type.split('.');
  return parts[parts.length - 1] ?? type;
}

function TaskExtraPreview({ task }: { task: FlowTask }) {
  const extra = Object.entries(task).filter(
    ([k]) => k !== 'id' && k !== 'type' && k !== 'description',
  );
  if (extra.length === 0) return <p className="text-xs text-muted-foreground italic">No additional properties.</p>;
  return (
    <ScrollArea className="max-h-[200px] rounded bg-muted/50">
      <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap p-2">
        {extra.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n')}
      </pre>
    </ScrollArea>
  );
}

export function TasksSection({ tasks, updateTask, addTask, removeTask, reorderTasks }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleAdd = () => {
    addTask({ id: `task-${tasks.length + 1}`, type: 'io.kestra.plugin.core.log.Log', message: 'Hello' });
  };

  const handleDragStart = (i: number) => setDragIndex(i);

  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== i) {
      reorderTasks(dragIndex, i);
      setDragIndex(i);
    }
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <IconPlus size={14} /> Add
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tasks defined. Add a task to get started.</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task, i) => {
            const isExpanded = expanded.has(i);
            return (
              <div
                key={`${task.id}-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                className="rounded-md border border-border bg-card transition-colors"
                style={{ opacity: dragIndex === i ? 0.5 : 1 }}
              >
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <IconGripVertical size={14} className="shrink-0 text-muted-foreground/50 cursor-grab" />
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                  </button>
                  <span className="text-xs font-medium text-foreground truncate flex-1">{task.id}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                    {shortType(task.type)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTask(i)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-3 py-2 space-y-2">
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-xs text-muted-foreground">id</label>
                      <input
                        className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={task.id}
                        onChange={(e) => updateTask(i, { id: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
                      <label className="text-xs text-muted-foreground">type</label>
                      <input
                        className="flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={task.type}
                        onChange={(e) => updateTask(i, { type: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-[80px_1fr] items-start gap-2">
                      <label className="text-xs text-muted-foreground pt-1">properties</label>
                      <TaskExtraPreview task={task} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
