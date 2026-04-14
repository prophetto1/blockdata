import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarkerType, addEdge, type Connection, type Edge, type Node, useEdgesState, useNodesState } from '@xyflow/react';
import FlowCanvas, { type FlowNodeData } from '@/components/flows/FlowCanvas';
import { WorkflowNodePalette } from '@/components/workflow/WorkflowNodePalette';
import { WorkflowNodeInspector } from '@/components/workflow/WorkflowNodeInspector';

type WorkflowNodeKind = NonNullable<FlowNodeData['kind']>;

type WorkflowSnapshot = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
};

type WorkflowEditorSurfaceProps = {
  storageKey: string;
  canvasTestId?: string;
};

const KIND_CONFIG: Record<WorkflowNodeKind, { title: string; body: string }> = {
  object: {
    title: 'Object',
    body: 'Represents a workflow object or target you want to shape on the canvas.',
  },
  skill: {
    title: 'Skill',
    body: 'Represents a reusable skill that can be connected to one or more objects.',
  },
  prompt: {
    title: 'Prompt',
    body: 'Represents a prompt or invocation that can be linked to the object it supports.',
  },
};

function makeNodeId(kind: WorkflowNodeKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createNodeAt(kind: WorkflowNodeKind, position: { x: number; y: number }, variant: 'start' | 'default' = 'default'): Node<FlowNodeData> {
  const config = KIND_CONFIG[kind];
  return {
    id: makeNodeId(kind),
    type: 'pmNode',
    position,
    data: {
      title: config.title,
      body: config.body,
      kind,
      variant,
      status: 'default',
    },
  };
}

function createDefaultSnapshot(): WorkflowSnapshot {
  const nodes = [
    createNodeAt('object', { x: 140, y: 140 }, 'start'),
    createNodeAt('skill',  { x: 400, y: 140 }),
    createNodeAt('prompt', { x: 660, y: 140 }),
  ];

  const edgeBase = {
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
  } as const;

  return {
    nodes,
    edges: [
      { id: `edge-${nodes[1].id}-${nodes[0].id}`, source: nodes[1].id, target: nodes[0].id, ...edgeBase },
      { id: `edge-${nodes[2].id}-${nodes[0].id}`, source: nodes[2].id, target: nodes[0].id, ...edgeBase },
    ],
  };
}

function readSnapshot(storageKey: string): WorkflowSnapshot {
  if (typeof window === 'undefined') {
    return createDefaultSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return createDefaultSnapshot();

    const parsed = JSON.parse(raw) as Partial<WorkflowSnapshot>;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || parsed.nodes.length === 0) {
      return createDefaultSnapshot();
    }

    return {
      nodes: parsed.nodes as Node<FlowNodeData>[],
      edges: parsed.edges as Edge[],
    };
  } catch {
    return createDefaultSnapshot();
  }
}

export function WorkflowEditorSurface({
  storageKey,
  canvasTestId = 'workflow-editor-canvas',
}: WorkflowEditorSurfaceProps) {
  const initialSnapshot = useMemo(() => readSnapshot(storageKey), [storageKey]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(initialSnapshot.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialSnapshot.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSnapshot.nodes[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }));
  }, [edges, nodes, storageKey]);

  useEffect(() => {
    if (selectedNodeId && nodes.some((node) => node.id === selectedNodeId)) return;
    // TODO: refactor to derived state - auto-select first node when current selection becomes invalid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedNodeId(nodes[0]?.id ?? null);
  }, [nodes, selectedNodeId]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const selectedConnectionCount = useMemo(() => {
    if (!selectedNodeId) return 0;
    return edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId).length;
  }, [edges, selectedNodeId]);

  const handleConnect = useCallback((connection: Connection) => {
    setEdges((existingEdges) => addEdge(connection, existingEdges));
  }, [setEdges]);

  const insertNode = useCallback((kind: WorkflowNodeKind, position: { x: number; y: number }) => {
    const next = createNodeAt(kind, position);
    setNodes((existingNodes) => [...existingNodes, next]);
    setSelectedNodeId(next.id);
  }, [setNodes]);

  const handleAddNode = useCallback((kind: WorkflowNodeKind) => {
    // Click-to-add: drop near the middle of the visible range based on current graph bounds.
    const offset = nodes.length * 24;
    insertNode(kind, { x: 220 + (offset % 480), y: 200 + (offset % 260) });
  }, [insertNode, nodes.length]);

  const handleNodeDrop = useCallback((kind: string, position: { x: number; y: number }) => {
    if (kind !== 'object' && kind !== 'skill' && kind !== 'prompt') return;
    insertNode(kind, position);
  }, [insertNode]);

  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes((existingNodes) => existingNodes.filter((node) => node.id !== selectedNodeId));
    setEdges((existingEdges) =>
      existingEdges.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setEdges, setNodes]);

  const updateSelectedNode = useCallback((patch: Partial<FlowNodeData>) => {
    if (!selectedNodeId) return;
    setNodes((existingNodes) => existingNodes.map((node) =>
      node.id === selectedNodeId
        ? { ...node, data: { ...node.data, ...patch } }
        : node));
  }, [selectedNodeId, setNodes]);

  const handleKindChange = useCallback((kind: WorkflowNodeKind) => {
    const fallback = KIND_CONFIG[kind];
    updateSelectedNode({
      kind,
      title: selectedNode?.data.title?.trim().length ? selectedNode.data.title : fallback.title,
      body: selectedNode?.data.body?.trim().length ? selectedNode.data.body : fallback.body,
    });
  }, [selectedNode, updateSelectedNode]);

  const renderedNodes = useMemo(() => nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      expanded: false,
      onDelete: node.id === selectedNodeId ? handleDeleteSelectedNode : undefined,
    },
  })), [handleDeleteSelectedNode, nodes, selectedNodeId]);

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-card/80 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{nodes.length}</span>
        <span>{nodes.length === 1 ? 'node' : 'nodes'}</span>
        <span className="text-border">/</span>
        <span>{selectedNode ? 'node selected' : 'canvas idle'}</span>
      </div>

      <div className="flex min-h-0 flex-1">
        <WorkflowNodePalette onAddNode={handleAddNode} />

        <div className="relative min-w-0 flex-1" data-testid={canvasTestId}>
          <FlowCanvas
            nodes={renderedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeDrop={handleNodeDrop}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            interactiveControls
          />
        </div>

        <WorkflowNodeInspector
          node={selectedNode}
          connectionCount={selectedConnectionCount}
          onTitleChange={(value) => updateSelectedNode({ title: value })}
          onBodyChange={(value) => updateSelectedNode({ body: value })}
          onKindChange={handleKindChange}
          onDelete={handleDeleteSelectedNode}
        />
      </div>
    </div>
  );
}
