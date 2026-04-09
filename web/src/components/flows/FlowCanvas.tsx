import { memo, useCallback, useEffect, useMemo, type ChangeEventHandler, type MouseEventHandler } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import type { FlowTask } from './nocode/flow-document';
import './flow-canvas.css';

export type FlowNodeData = {
  title: string;
  body: string;
  kind?: 'object' | 'skill' | 'prompt';
  status?: 'default' | 'warning' | 'error' | 'disabled';
  variant?: 'start' | 'default';
  expanded?: boolean;
  connectionCount?: number;
  onTitleChange?: (value: string) => void;
  onBodyChange?: (value: string) => void;
  onKindChange?: (kind: 'object' | 'skill' | 'prompt') => void;
  onDelete?: () => void;
  onCollapse?: () => void;
};

const FlowNode = memo(({ data, selected, dragging }: NodeProps<Node<FlowNodeData>>) => {
  const handleTitleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    data.onTitleChange?.(event.target.value);
  };

  const handleBodyChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    data.onBodyChange?.(event.target.value);
  };

  const handleKindChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    data.onKindChange?.(event.target.value as 'object' | 'skill' | 'prompt');
  };

  return (
    <div
      className={cn(
        'pm-flow-node',
        selected && 'is-selected',
        dragging && 'is-dragging',
        data.expanded && 'is-expanded',
      )}
      data-variant={data.variant ?? 'default'}
      data-status={data.status ?? 'default'}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="pm-flow-node__header">
        <div className="pm-flow-node__title">{data.title}</div>
        <div className="pm-flow-node__header-actions">
          {data.kind ? <div className="pm-flow-node__kind">{data.kind}</div> : null}
          {data.expanded ? (
            <button
              type="button"
              className="pm-flow-node__collapse nodrag nopan"
              onClick={data.onCollapse}
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
      {data.expanded ? (
        <div className="pm-flow-node__editor nodrag nopan nowheel">
          <label className="pm-flow-node__field">
            <span className="pm-flow-node__field-label">Title</span>
            <input
              value={data.title}
              onChange={handleTitleChange}
              className="pm-flow-node__input"
            />
          </label>

          <label className="pm-flow-node__field">
            <span className="pm-flow-node__field-label">Type</span>
            <select
              value={data.kind ?? 'object'}
              onChange={handleKindChange}
              className="pm-flow-node__input"
            >
              <option value="object">Object</option>
              <option value="skill">Skill</option>
              <option value="prompt">Prompt</option>
            </select>
          </label>

          <label className="pm-flow-node__field">
            <span className="pm-flow-node__field-label">Description</span>
            <textarea
              value={data.body}
              onChange={handleBodyChange}
              rows={5}
              className="pm-flow-node__textarea"
            />
          </label>

          <div className="pm-flow-node__meta">
            <span>Connections</span>
            <strong>{data.connectionCount ?? 0}</strong>
          </div>

          <div className="pm-flow-node__footer">
            <button
              type="button"
              className="pm-flow-node__footer-button nodrag nopan"
              onClick={data.onCollapse}
            >
              Collapse
            </button>
            <button
              type="button"
              className="pm-flow-node__footer-button pm-flow-node__footer-button--danger nodrag nopan"
              onClick={data.onDelete}
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="pm-flow-node__body">{data.body}</div>
      )}
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
});

FlowNode.displayName = 'FlowNode';

function shortType(type: string): string {
  const parts = type.split('.');
  return parts[parts.length - 1] ?? type;
}

function deriveNodesFromTasks(tasks: FlowTask[]): Node<FlowNodeData>[] {
  return tasks.map((task, i) => ({
    id: task.id,
    type: 'pmNode',
    position: { x: 140 + i * 280, y: 120 },
    data: {
      title: task.id,
      body: shortType(task.type),
      variant: i === 0 ? 'start' as const : 'default' as const,
      status: 'default' as const,
    },
  }));
}

function deriveEdgesFromTasks(tasks: FlowTask[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < tasks.length - 1; i++) {
    edges.push({
      id: `e-${tasks[i].id}-${tasks[i + 1].id}`,
      source: tasks[i].id,
      target: tasks[i + 1].id,
    });
  }
  return edges;
}

const fallbackNodes: Node<FlowNodeData>[] = [
  {
    id: 'start',
    type: 'pmNode',
    position: { x: 140, y: 120 },
    data: {
      title: 'Start',
      body: 'Add tasks in the code editor to see them here.',
      variant: 'start',
      status: 'default',
    },
  },
];

const fallbackEdges: Edge[] = [];

type FlowCanvasProps = {
  tasks?: FlowTask[];
  nodes?: Node<FlowNodeData>[];
  edges?: Edge[];
  onNodesChange?: OnNodesChange<Node<FlowNodeData>>;
  onEdgesChange?: OnEdgesChange<Edge>;
  onConnect?: (connection: Connection) => void;
  onNodeClick?: NodeMouseHandler<Node<FlowNodeData>>;
  onPaneClick?: MouseEventHandler<Element>;
  interactiveControls?: boolean;
};

const nodeTypes = { pmNode: FlowNode };

export default function FlowCanvas({
  tasks,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  interactiveControls = false,
}: FlowCanvasProps) {
  const hasTasks = tasks && tasks.length > 0;

  const derivedNodes = useMemo(
    () => (hasTasks ? deriveNodesFromTasks(tasks) : fallbackNodes),
    [hasTasks, tasks],
  );

  const derivedEdges = useMemo(
    () => (hasTasks ? deriveEdgesFromTasks(tasks) : fallbackEdges),
    [hasTasks, tasks],
  );

  const [internalNodes, setInternalNodes, onInternalNodesChange] = useNodesState(derivedNodes);
  const [internalEdges, setInternalEdges, onInternalEdgesChange] = useEdgesState(derivedEdges);

  useEffect(() => {
    if (nodes) return;
    setInternalNodes(derivedNodes);
  }, [derivedNodes, nodes, setInternalNodes]);

  useEffect(() => {
    if (edges) return;
    setInternalEdges(derivedEdges);
  }, [derivedEdges, edges, setInternalEdges]);

  const resolvedNodes = nodes ?? internalNodes;
  const resolvedEdges = edges ?? internalEdges;
  const resolvedOnNodesChange = onNodesChange ?? onInternalNodesChange;
  const resolvedOnEdgesChange = onEdgesChange ?? onInternalEdgesChange;

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (onConnect) {
        onConnect(connection);
        return;
      }

      setInternalEdges((existingEdges) => addEdge(connection, existingEdges));
    },
    [onConnect, setInternalEdges],
  );

  return (
    <div className="pm-reactflow-wrap">
      <ReactFlow
        nodes={resolvedNodes}
        edges={resolvedEdges}
        onNodesChange={resolvedOnNodesChange}
        onEdgesChange={resolvedOnEdgesChange}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        nodeDragThreshold={3}
        connectionDragThreshold={3}
        paneClickDistance={3}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        nodesConnectable
        nodesFocusable
        nodesDraggable
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={interactiveControls} />
        <MiniMap pannable zoomable nodeColor="var(--card)" maskColor="rgba(0, 0, 0, 0.3)" />
      </ReactFlow>
    </div>
  );
}
