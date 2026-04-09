import { useCallback, useEffect, useMemo, useState } from 'react';
import { addEdge, type Connection, type Edge, type Node, useEdgesState, useNodesState } from '@xyflow/react';
import {
  IconCirclePlus,
  IconLayoutColumns,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import FlowCanvas, { type FlowNodeData } from '@/components/flows/FlowCanvas';

type CanvasNodeKind = NonNullable<FlowNodeData['kind']>;

type SkillDrivenSnapshot = {
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
};

const STORAGE_KEY = 'superuser.skill-driven-dev.graph.v1';

const KIND_CONFIG: Record<CanvasNodeKind, { title: string; body: string }> = {
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

function createNode(kind: CanvasNodeKind, index: number): Node<FlowNodeData> {
  const config = KIND_CONFIG[kind];
  const sequence = index + 1;

  return {
    id: `${kind}-${Date.now()}-${sequence}`,
    type: 'pmNode',
    position: {
      x: 120 + (index % 3) * 260,
      y: 120 + Math.floor(index / 3) * 180,
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

function createDefaultSnapshot(): SkillDrivenSnapshot {
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

function readSnapshot(): SkillDrivenSnapshot {
  if (typeof window === 'undefined') {
    return createDefaultSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultSnapshot();
    }

    const parsed = JSON.parse(raw) as Partial<SkillDrivenSnapshot>;
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

export function Component() {
  useShellHeaderTitle({
    title: 'Skill-Driven Dev',
    breadcrumbs: ['Superuser', 'Skill-Driven Dev'],
  });

  const initialSnapshot = useMemo(() => readSnapshot(), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<FlowNodeData>>(initialSnapshot.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialSnapshot.edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSnapshot.nodes[0]?.id ?? null);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const totalByKind = useMemo(() => ({
    object: nodes.filter((node) => node.data.kind === 'object').length,
    skill: nodes.filter((node) => node.data.kind === 'skill').length,
    prompt: nodes.filter((node) => node.data.kind === 'prompt').length,
  }), [nodes]);

  const selectedNodeConnections = useMemo(() => {
    if (!selectedNodeId) return 0;
    return edges.filter((edge) => edge.source === selectedNodeId || edge.target === selectedNodeId).length;
  }, [edges, selectedNodeId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [edges, nodes]);

  useEffect(() => {
    if (selectedNodeId && nodes.some((node) => node.id === selectedNodeId)) return;
    // TODO: refactor to derived state — auto-select first node when current selection becomes invalid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedNodeId(nodes[0]?.id ?? null);
  }, [nodes, selectedNodeId]);

  const handleConnect = useCallback((connection: Connection) => {
    setEdges((existingEdges) => addEdge(connection, existingEdges));
  }, [setEdges]);

  const handleAddNode = useCallback((kind: CanvasNodeKind) => {
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

  const updateSelectedNode = useCallback((
    patch: Partial<FlowNodeData>,
  ) => {
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

  const handleKindChange = useCallback((kind: CanvasNodeKind) => {
    const fallback = KIND_CONFIG[kind];
    updateSelectedNode({
      kind,
      title: selectedNode?.data.title?.trim().length ? selectedNode.data.title : fallback.title,
      body: selectedNode?.data.body?.trim().length ? selectedNode.data.body : fallback.body,
    });
  }, [selectedNode, updateSelectedNode]);

  return (
    <main className="h-full w-full min-h-0 p-2">
      <div className="grid h-full min-h-0 grid-cols-1 gap-2 xl:grid-cols-[220px_minmax(0,1fr)_260px]">
        <section className="flex min-h-[180px] flex-col gap-3 rounded-md border border-border bg-card p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Canvas Tools
            </p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">Graph palette</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Local-only for now. Add, connect, and tune nodes from the inspector.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent"
              onClick={() => handleAddNode('object')}
            >
              <IconCirclePlus size={13} />
              <span>Add Object</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent"
              onClick={() => handleAddNode('skill')}
            >
              <IconCirclePlus size={13} />
              <span>Add Skill</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent"
              onClick={() => handleAddNode('prompt')}
            >
              <IconCirclePlus size={13} />
              <span>Add Prompt</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-background/50 px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
              disabled
              title="Future node types will live here"
            >
              <IconCirclePlus size={13} />
              <span>More</span>
            </button>
          </div>

          <div className="rounded-md border border-border bg-background/50 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Counts</p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Objects</dt>
                <dd className="text-sm font-semibold text-foreground">{totalByKind.object}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Skills</dt>
                <dd className="text-sm font-semibold text-foreground">{totalByKind.skill}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prompts</dt>
                <dd className="text-sm font-semibold text-foreground">{totalByKind.prompt}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent"
              onClick={handleResetCanvas}
            >
              <IconRefresh size={13} />
              <span>Reset Sample Graph</span>
            </button>
            <p className="text-[11px] leading-5 text-muted-foreground">
              Drag from a node handle to another node to create a connection.
            </p>
          </div>
        </section>

        <section className="min-h-[420px] min-w-0 overflow-hidden rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Topology
              </p>
              <h2 className="mt-1 text-sm font-semibold text-foreground">Skill graph canvas</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
              <IconLayoutColumns size={12} />
              <span>{nodes.length} nodes</span>
            </div>
          </div>
          <div className="h-[calc(100%-57px)] min-h-0" data-testid="skill-driven-dev-canvas">
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              interactiveControls
            />
          </div>
        </section>

        <section className="flex min-h-[180px] flex-col gap-3 rounded-md border border-border bg-card p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Inspector
            </p>
            <h2 className="mt-1 text-sm font-semibold text-foreground">Selected node</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Click a node to tune its label, kind, and description.
            </p>
          </div>

          {selectedNode ? (
            <>
              <label className="grid gap-1.5 text-xs text-foreground">
                <span className="font-medium">Title</span>
                <input
                  value={selectedNode.data.title}
                  onChange={(event) => updateSelectedNode({ title: event.target.value })}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none ring-0 transition focus:border-ring"
                />
              </label>

              <label className="grid gap-1.5 text-xs text-foreground">
                <span className="font-medium">Kind</span>
                <select
                  value={selectedNode.data.kind ?? 'object'}
                  onChange={(event) => handleKindChange(event.target.value as CanvasNodeKind)}
                  className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none ring-0 transition focus:border-ring"
                >
                  <option value="object">Object</option>
                  <option value="skill">Skill</option>
                  <option value="prompt">Prompt</option>
                </select>
              </label>

              <label className="grid gap-1.5 text-xs text-foreground">
                <span className="font-medium">Description</span>
                <textarea
                  value={selectedNode.data.body}
                  onChange={(event) => updateSelectedNode({ body: event.target.value })}
                  rows={6}
                  className="resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none ring-0 transition focus:border-ring"
                />
              </label>

              <div className="rounded-md border border-border bg-background/50 p-2.5 text-xs text-muted-foreground">
                <p><span className="font-medium text-foreground">Node ID:</span> {selectedNode.id}</p>
                <p className="mt-1"><span className="font-medium text-foreground">Connections:</span> {selectedNodeConnections}</p>
              </div>

              <button
                type="button"
                className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/15"
                onClick={handleDeleteSelectedNode}
              >
                <IconTrash size={13} />
                <span>Delete Node</span>
              </button>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border bg-background/30 px-4 text-center text-xs leading-5 text-muted-foreground">
              Select a node to edit it. Click the canvas background to clear the current selection.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
