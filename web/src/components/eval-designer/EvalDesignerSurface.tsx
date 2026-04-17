import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarkerType, addEdge, type Connection, type Edge, type Node, useEdgesState, useNodesState } from '@xyflow/react';
import FlowCanvas, { type FlowNodeData } from '@/components/flows/FlowCanvas';
import './eval-designer-surface.css';

type EvalDesignerNodeKind = NonNullable<FlowNodeData['kind']>;

type EvalDesignerSnapshot = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
};

type EvalDesignerSurfaceProps = {
  projectName: string;
  storageKey: string;
  canvasTestId?: string;
};

const KIND_CONFIG: Record<EvalDesignerNodeKind, { title: string; body: string }> = {
  object: {
    title: 'Object',
    body: 'Represents an evaluation object or target you want to shape on the canvas.',
  },
  skill: {
    title: 'Skill',
    body: 'Represents a reusable skill that can be connected to one or more evaluation objects.',
  },
  prompt: {
    title: 'Prompt',
    body: 'Represents a prompt or invocation that can be linked to the evaluation object it supports.',
  },
};

function makeNodeId(kind: EvalDesignerNodeKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createNodeAt(kind: EvalDesignerNodeKind, position: { x: number; y: number }, variant: 'start' | 'default' = 'default'): Node<FlowNodeData> {
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

function createDefaultSnapshot(): EvalDesignerSnapshot {
  const nodes = [
    createNodeAt('object', { x: 140, y: 140 }, 'start'),
    createNodeAt('skill', { x: 400, y: 140 }),
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

function readSnapshot(storageKey: string): EvalDesignerSnapshot {
  if (typeof window === 'undefined') {
    return createDefaultSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return createDefaultSnapshot();

    const parsed = JSON.parse(raw) as Partial<EvalDesignerSnapshot>;
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

export function EvalDesignerSurface({
  projectName,
  storageKey,
  canvasTestId = 'eval-designer-canvas',
}: EvalDesignerSurfaceProps) {
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
    setSelectedNodeId(nodes[0]?.id ?? null);
  }, [nodes, selectedNodeId]);

  const handleConnect = useCallback((connection: Connection) => {
    setEdges((existingEdges) => addEdge(connection, existingEdges));
  }, [setEdges]);

  const insertNode = useCallback((kind: EvalDesignerNodeKind, position: { x: number; y: number }) => {
    const next = createNodeAt(kind, position);
    setNodes((existingNodes) => [...existingNodes, next]);
    setSelectedNodeId(next.id);
  }, [setNodes]);

  const handleAddNode = useCallback((kind: EvalDesignerNodeKind) => {
    const offset = nodes.length * 28;
    insertNode(kind, { x: 220 + (offset % 520), y: 160 + (offset % 260) });
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

  const renderedNodes = useMemo(() => nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      expanded: false,
      onDelete: node.id === selectedNodeId ? handleDeleteSelectedNode : undefined,
    },
  })), [handleDeleteSelectedNode, nodes, selectedNodeId]);

  return (
    <div className="eval-designer-surface">
      <div className="eval-designer-surface__toolbar">
        <div className="eval-designer-surface__identity">
          <div className="eval-designer-surface__title-row">
            <h1 className="eval-designer-surface__title">Eval Designer</h1>
            <span className="eval-designer-surface__project-pill">{projectName}</span>
          </div>
        </div>

        <div className="eval-designer-surface__actions" aria-label="Eval designer actions">
          <button
            type="button"
            className="eval-designer-surface__action"
            onClick={() => handleAddNode('object')}
          >
            New object
          </button>
          <button
            type="button"
            className="eval-designer-surface__action"
            onClick={() => handleAddNode('skill')}
          >
            New skill
          </button>
          <button
            type="button"
            className="eval-designer-surface__action eval-designer-surface__action--primary"
            onClick={() => handleAddNode('prompt')}
          >
            New prompt
          </button>
        </div>
      </div>

      <div className="eval-designer-surface__canvas" data-testid={canvasTestId}>
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
    </div>
  );
}
