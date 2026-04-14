import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  type ChangeEventHandler,
  type DragEvent as ReactDragEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import { useEdgesState, useNodesState } from '@xyflow/react';
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
      {data.onDelete ? (
        <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
          <button
            type="button"
            onClick={data.onDelete}
            className="pm-flow-node__toolbar-button pm-flow-node__toolbar-button--danger"
          >
            Delete
          </button>
        </NodeToolbar>
      ) : null}
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
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
    });
  }
  return edges;
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed },
} as const;

const isValidConnection: IsValidConnection = (connection) =>
  connection.source !== connection.target;

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

export const FLOW_NODE_KIND_MIME = 'application/x-flow-node-kind';

type FlowCanvasProps = {
  tasks?: FlowTask[];
  nodes?: Node<FlowNodeData>[];
  edges?: Edge[];
  onNodesChange?: OnNodesChange<Node<FlowNodeData>>;
  onEdgesChange?: OnEdgesChange<Edge>;
  onConnect?: (connection: Connection) => void;
  onNodeClick?: NodeMouseHandler<Node<FlowNodeData>>;
  onPaneClick?: MouseEventHandler<Element>;
  onNodeDrop?: (kind: string, position: { x: number; y: number }) => void;
  interactiveControls?: boolean;
  children?: ReactNode;
};

const nodeTypes = { pmNode: FlowNode };

function FlowCanvasInner({
  tasks,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onNodeDrop,
  interactiveControls = false,
  children,
}: FlowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
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
      if (connection.source === connection.target) return;

      if (onConnect) {
        onConnect(connection);
        return;
      }

      setInternalEdges((existingEdges) =>
        addEdge({ ...connection, ...defaultEdgeOptions }, existingEdges),
      );
    },
    [onConnect, setInternalEdges],
  );

  const handleDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!onNodeDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [onNodeDrop]);

  const handleDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!onNodeDrop) return;
    event.preventDefault();
    const kind = event.dataTransfer.getData(FLOW_NODE_KIND_MIME);
    if (!kind) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onNodeDrop(kind, position);
  }, [onNodeDrop, screenToFlowPosition]);

  return (
    <div className="pm-reactflow-wrap" onDragOver={handleDragOver} onDrop={handleDrop}>
        <ReactFlow
          nodes={resolvedNodes}
          edges={resolvedEdges}
          onNodesChange={resolvedOnNodesChange}
          onEdgesChange={resolvedOnEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          colorMode="system"
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
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
          {children}
        </ReactFlow>
      </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
