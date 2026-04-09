import { useCallback, useEffect, useMemo, useState } from 'react';
import { addEdge, type Connection, type Edge, type Node, useEdgesState, useNodesState } from '@xyflow/react';
import { IconRefresh } from '@tabler/icons-react';
import FlowCanvas, { type FlowNodeData } from '@/components/flows/FlowCanvas';

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

function createNode(kind: WorkflowNodeKind, index: number): Node<FlowNodeData> {
  const config = KIND_CONFIG[kind];
  const sequence = index + 1;

  return {
    id: `${kind}-${Date.now()}-${sequence}`,
    type: 'pmNode',
    position: {
      x: 140 + (index % 3) * 260,
      y: 140 + Math.floor(index / 3) * 190,
    },
    data: {
      title: `${config.title} ${sequence}`,
      body: config.body,
      kind,
      variant: index === 0 ? 'start' : 'default',
      status: 'default',
    },
  };
}

function createDefaultSnapshot(): WorkflowSnapshot {
  const nodes = [
    createNode('object', 0),
    createNode('skill', 1),
    createNode('prompt', 2),
  ];

  return {
    nodes,
    edges: [
      {
        id: `edge-${nodes[1]?.id}-${nodes[0]?.id}`,
        source: nodes[1]?.id ?? 'skill',
        target: nodes[0]?.id ?? 'object',
      },
      {
        id: `edge-${nodes[2]?.id}-${nodes[0]?.id}`,
        source: nodes[2]?.id ?? 'prompt',
        target: nodes[0]?.id ?? 'object',
      },
    ],
  };
}

function readSnapshot(storageKey: string): WorkflowSnapshot {
  if (typeof window === 'undefined') {
    return createDefaultSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return createDefaultSnapshot();
    }

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

type CanvasActionButtonProps = {
  ariaLabel: string;
  title: string;
  text: string;
  onClick: () => void;
};

function CanvasActionButton({ ariaLabel, title, text, onClick }: CanvasActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/95 text-[11px] font-semibold text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
    >
      <span aria-hidden>{text}</span>
    </button>
  );
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

  const handleConnect = useCallback((connection: Connection) => {
    setEdges((existingEdges) => addEdge(connection, existingEdges));
  }, [setEdges]);

  const handleAddNode = useCallback((kind: WorkflowNodeKind) => {
    setNodes((existingNodes) => {
      const nextNode = createNode(kind, existingNodes.length);
      setSelectedNodeId(nextNode.id);
      return [...existingNodes, nextNode];
    });
  }, [setNodes]);

  const handleResetCanvas = useCallback(() => {
    const nextSnapshot = createDefaultSnapshot();
    setNodes(nextSnapshot.nodes);
    setEdges(nextSnapshot.edges);
    setSelectedNodeId(nextSnapshot.nodes[0]?.id ?? null);
  }, [setEdges, setNodes]);

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
        ? {
            ...node,
            data: {
              ...node.data,
              ...patch,
            },
          }
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

  const renderedNodes = useMemo(() => nodes.map((node) => {
    const isExpanded = node.id === selectedNodeId;
    const connectionCount = edges.filter((edge) => edge.source === node.id || edge.target === node.id).length;

    return {
      ...node,
      data: {
        ...node.data,
        expanded: isExpanded,
        connectionCount,
        onTitleChange: isExpanded ? (value: string) => updateSelectedNode({ title: value }) : undefined,
        onBodyChange: isExpanded ? (value: string) => updateSelectedNode({ body: value }) : undefined,
        onKindChange: isExpanded ? handleKindChange : undefined,
        onDelete: isExpanded ? handleDeleteSelectedNode : undefined,
        onCollapse: isExpanded ? () => setSelectedNodeId(null) : undefined,
      },
    };
  }), [edges, handleDeleteSelectedNode, handleKindChange, nodes, selectedNodeId, updateSelectedNode]);

  return (
    <div className="relative h-full min-h-[560px] overflow-hidden rounded-md border border-border bg-card">
      <div className="h-full min-h-0" data-testid={canvasTestId}>
        <FlowCanvas
          nodes={renderedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          interactiveControls
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-start justify-between px-3">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm">
          <span className="font-medium text-foreground">{nodes.length}</span>
          <span>{nodes.length === 1 ? 'node' : 'nodes'}</span>
          <span className="text-border">/</span>
          <span>{selectedNode ? 'node editor open' : 'canvas idle'}</span>
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-14 z-10">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/95 p-1 shadow-sm">
          <CanvasActionButton ariaLabel="Add Object" title="Add Object" text="O" onClick={() => handleAddNode('object')} />
          <CanvasActionButton ariaLabel="Add Skill" title="Add Skill" text="S" onClick={() => handleAddNode('skill')} />
          <CanvasActionButton ariaLabel="Add Prompt" title="Add Prompt" text="P" onClick={() => handleAddNode('prompt')} />
          <button
            type="button"
            aria-label="Reset Sample Graph"
            title="Reset Sample Graph"
            onClick={handleResetCanvas}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/95 text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
          >
            <IconRefresh size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
