import { memo, useCallback, useMemo } from 'react';
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
  type NodeProps,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import type { FlowTask } from './nocode/flow-document';
import './flow-canvas.css';

type FlowNodeData = {
  title: string;
  body: string;
  status?: 'default' | 'warning' | 'error' | 'disabled';
  variant?: 'start' | 'default';
};

const FlowNode = memo(({ data, selected, dragging }: NodeProps<Node<FlowNodeData>>) => {
  return (
    <div
      className={cn('pm-flow-node', selected && 'is-selected', dragging && 'is-dragging')}
      data-variant={data.variant ?? 'default'}
      data-status={data.status ?? 'default'}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <div className="pm-flow-node__title">{data.title}</div>
      <div className="pm-flow-node__body">{data.body}</div>
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
};

const nodeTypes = { pmNode: FlowNode };

export default function FlowCanvas({ tasks }: FlowCanvasProps) {
  const hasTasks = tasks && tasks.length > 0;

  const derivedNodes = useMemo(
    () => (hasTasks ? deriveNodesFromTasks(tasks) : fallbackNodes),
    [hasTasks, tasks],
  );

  const derivedEdges = useMemo(
    () => (hasTasks ? deriveEdgesFromTasks(tasks) : fallbackEdges),
    [hasTasks, tasks],
  );

  const [nodes, , onNodesChange] = useNodesState(derivedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  return (
    <div className="pm-reactflow-wrap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable nodeColor="var(--card)" maskColor="rgba(0, 0, 0, 0.3)" />
      </ReactFlow>
    </div>
  );
}
