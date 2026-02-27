import { memo, useCallback } from 'react';
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
import './flow-canvas.css';

type FlowNodeData = {
  title: string;
  body: string;
  status?: 'default' | 'warning' | 'error' | 'disabled';
  variant?: 'start' | 'default';
};

const FlowNode = memo(({ data, selected, dragging }: NodeProps<Node<FlowNodeData>>) => {
  const classes = ['pm-flow-node'];
  if (selected) classes.push('is-selected');
  if (dragging) classes.push('is-dragging');
  return (
    <div
      className={classes.join(' ')}
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

const initialNodes: Node<FlowNodeData>[] = [
  {
    id: 'start',
    type: 'pmNode',
    position: { x: 140, y: 120 },
    data: {
      title: 'Start',
      body: 'Change trigger, then add connected blocks.',
      variant: 'start',
      status: 'default',
    },
    selected: true,
  },
  {
    id: 'action-1',
    type: 'pmNode',
    position: { x: 420, y: 120 },
    data: {
      title: 'Evaluate',
      body: 'Run model check and emit result.',
      status: 'warning',
    },
  },
  {
    id: 'action-2',
    type: 'pmNode',
    position: { x: 700, y: 120 },
    data: {
      title: 'Publish',
      body: 'Target API rejected payload shape.',
      status: 'error',
    },
  },
  {
    id: 'hold',
    type: 'pmNode',
    position: { x: 420, y: 280 },
    draggable: false,
    data: {
      title: 'Manual review',
      body: 'Paused until reviewer confirms changes.',
      status: 'disabled',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-start-action-1',
    source: 'start',
    target: 'action-1',
    animated: false,
  },
  {
    id: 'e-action-1-action-2',
    source: 'action-1',
    target: 'action-2',
    selected: true,
  },
];

const nodeTypes = { pmNode: FlowNode };

export default function FlowCanvas() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
