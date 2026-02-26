import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconLayoutColumns, IconPlayerPlay, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import FlowCanvas from './FlowCanvas';
import {
  activateTabInPane,
  closeTabInPane,
  createInitialPanes,
  FLOW_WORKBENCH_TABS,
  setActiveTabInPane,
  type Pane,
  type PaneTabId,
} from './flowWorkbenchState';
import './FlowWorkbench.css';

type FlowWorkbenchProps = {
  flowId: string;
  flowName: string;
  namespace: string;
};

type ResizeState = {
  index: number;
  startX: number;
  startLeft: number;
  startRight: number;
};

type DragTabState = {
  tabId: PaneTabId;
  fromPaneId: string;
};

type DragPaneState = {
  fromIndex: number;
};

const MIN_PANE_PERCENT = 18;
const MAX_COLUMNS = 4;
const SAVE_KEY_PREFIX = 'flow-workbench-layout';

const TAB_IDS = FLOW_WORKBENCH_TABS.map((tab) => tab.id) as readonly PaneTabId[];

type PersistedPane = {
  id: string;
  tabs: string[];
  activeTab: string;
  width: number;
};

function isPaneTabId(value: string): value is PaneTabId {
  return TAB_IDS.some((tabId) => tabId === value);
}

function normalizePaneWidths(input: Pane[]): Pane[] {
  if (input.length === 0) return input;
  const total = input.reduce((sum, pane) => sum + pane.width, 0);
  if (total <= 0) {
    const equal = 100 / input.length;
    return input.map((pane) => ({ ...pane, width: equal }));
  }

  return input.map((pane) => ({
    ...pane,
    width: (pane.width / total) * 100,
  }));
}

function getNextTab(existing: PaneTabId[]): PaneTabId {
  return FLOW_WORKBENCH_TABS.find((item) => !existing.includes(item.id))?.id ?? 'documentation';
}

function tabLabel(tabId: PaneTabId): string {
  return FLOW_WORKBENCH_TABS.find((item) => item.id === tabId)?.label ?? tabId;
}

function fallbackTab(): PaneTabId {
  return 'flowCode';
}

function buildDefaultFlowCode(flowName: string, namespace: string): string {
  return `id: ${flowName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
namespace: ${namespace}

tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: "Hello from ${flowName}"`;
}

function readPersistedPanes(saveKey: string): Pane[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(saveKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedPane[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const normalized = parsed.map((item, index): Pane => {
      const tabs = Array.from(
        new Set((item.tabs ?? []).filter((candidate): candidate is PaneTabId => isPaneTabId(candidate))),
      );
      const resolvedTabs = tabs.length > 0 ? tabs : [fallbackTab()];
      const resolvedActive = isPaneTabId(item.activeTab) && resolvedTabs.includes(item.activeTab)
        ? item.activeTab
        : resolvedTabs[0];

      return {
        id: item.id || `pane-${index + 1}`,
        tabs: resolvedTabs,
        activeTab: resolvedActive,
        width: Number.isFinite(item.width) && item.width > 0 ? item.width : 100 / parsed.length,
      };
    });

    return normalizePaneWidths(normalized.slice(0, MAX_COLUMNS));
  } catch {
    return null;
  }
}

function renderTabContent(
  tabId: PaneTabId,
  flowName: string,
  codeDraft: string,
  setCodeDraft: (next: string) => void,
) {
  switch (tabId) {
    case 'flowCode':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">Flow Code</p>
          <textarea
            aria-label="Flow code editor"
            className="min-h-[320px] w-full rounded-md border border-border bg-background p-3 font-mono text-xs text-foreground"
            value={codeDraft}
            onChange={(event) => setCodeDraft(event.currentTarget.value)}
          />
        </div>
      );
    case 'topology':
      return <FlowCanvas />;
    case 'documentation':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">Documentation</p>
          <p className="text-sm text-muted-foreground">
            Shared contract notes for {flowName}.
          </p>
        </div>
      );
    case 'files':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">Files</p>
          <p className="text-sm text-muted-foreground">Flow files and namespace assets will appear here.</p>
        </div>
      );
    case 'blueprints':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">Blueprints</p>
          <p className="text-sm text-muted-foreground">Blueprint catalog integration is staged for this surface.</p>
        </div>
      );
    case 'nocode':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-foreground">No-code</p>
          <p className="text-sm text-muted-foreground">No-code form shell placeholder.</p>
        </div>
      );
    default:
      return null;
  }
}

export default function FlowWorkbench({ flowId, flowName, namespace }: FlowWorkbenchProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const nextPaneIdRef = useRef(3);
  const dragStateRef = useRef<DragTabState | null>(null);
  const dragPaneStateRef = useRef<DragPaneState | null>(null);
  const saveKey = `${SAVE_KEY_PREFIX}:${namespace}:${flowId}`;

  const [panes, setPanes] = useState<Pane[]>(createInitialPanes);
  const [codeDraft, setCodeDraft] = useState(() => buildDefaultFlowCode(flowName, namespace));
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [activeResizerIndex, setActiveResizerIndex] = useState<number | null>(null);
  const [dragOverPaneIndex, setDragOverPaneIndex] = useState<number | null>(null);

  useEffect(() => {
    const persisted = readPersistedPanes(saveKey);
    if (persisted && persisted.length > 0) {
      setPanes(persisted);
      nextPaneIdRef.current = persisted.length + 1;
      return;
    }
    setPanes(createInitialPanes());
    nextPaneIdRef.current = 3;
  }, [saveKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = panes.map((pane): PersistedPane => ({
      id: pane.id,
      tabs: pane.tabs,
      activeTab: pane.activeTab,
      width: pane.width,
    }));
    window.localStorage.setItem(saveKey, JSON.stringify(payload));
  }, [panes, saveKey]);

  useEffect(() => {
    setCodeDraft((previous) => {
      const trimmed = previous.trim();
      if (trimmed.length > 0) return previous;
      return buildDefaultFlowCode(flowName, namespace);
    });
  }, [flowName, namespace]);

  const startResize = useCallback((index: number, event: React.PointerEvent<HTMLDivElement>) => {
    const left = panes[index];
    const right = panes[index + 1];
    if (!left || !right) return;

    event.preventDefault();
    resizeStateRef.current = {
      index,
      startX: event.clientX,
      startLeft: left.width,
      startRight: right.width,
    };
    setActiveResizerIndex(index);
  }, [panes]);

  useEffect(() => {
    if (activeResizerIndex === null) return;

    const onPointerMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;
      const root = rootRef.current;
      if (!state || !root) return;

      const totalPx = root.clientWidth;
      if (!Number.isFinite(totalPx) || totalPx <= 0) return;

      const deltaPercent = (event.clientX - state.startX) / totalPx * 100;
      const pairTotal = state.startLeft + state.startRight;
      const nextLeft = Math.max(MIN_PANE_PERCENT, Math.min(pairTotal - MIN_PANE_PERCENT, state.startLeft + deltaPercent));
      const nextRight = pairTotal - nextLeft;

      setPanes((current) => {
        const next = [...current];
        const left = next[state.index];
        const right = next[state.index + 1];
        if (!left || !right) return current;
        next[state.index] = { ...left, width: nextLeft };
        next[state.index + 1] = { ...right, width: nextRight };
        return next;
      });
    };

    const stopResize = () => {
      resizeStateRef.current = null;
      setActiveResizerIndex(null);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [activeResizerIndex]);

  const addColumn = useCallback(() => {
    setPanes((current) => {
      if (current.length >= MAX_COLUMNS) return current;

      const nextId = `pane-${nextPaneIdRef.current}`;
      nextPaneIdRef.current += 1;
      const nextPane: Pane = {
        id: nextId,
        tabs: ['documentation'],
        activeTab: 'documentation',
        width: 100 / (current.length + 1),
      };

      const next: Pane[] = [...current, nextPane].map((pane): Pane => ({
        ...pane,
        width: 100 / (current.length + 1),
      }));

      return next;
    });
  }, []);

  const removeColumn = useCallback((paneId: string) => {
    setPanes((current) => {
      if (current.length <= 1) return current;
      const filtered = current.filter((pane) => pane.id !== paneId);
      if (filtered.length === current.length) return current;
      return normalizePaneWidths(filtered);
    });
  }, []);

  const resetLayout = useCallback(() => {
    setPanes((current) => normalizePaneWidths(current.map((pane) => ({ ...pane, width: 100 / current.length }))));
  }, []);

  const addTabToPane = useCallback((paneId: string) => {
    setPanes((current) => {
      const targetPane = current.find((pane) => pane.id === paneId);
      if (!targetPane) return current;
      const nextTab = getNextTab(targetPane.tabs);
      return activateTabInPane(current, paneId, nextTab);
    });
  }, []);

  const setActiveTab = useCallback((paneId: string, tabId: PaneTabId) => {
    setPanes((current) => setActiveTabInPane(current, paneId, tabId));
  }, []);

  const closeTab = useCallback((paneId: string, tabId: PaneTabId) => {
    setPanes((current) => closeTabInPane(current, paneId, tabId));
  }, []);

  const closeTabOrColumn = useCallback((pane: Pane, tabId: PaneTabId) => {
    if (pane.tabs.length > 1) {
      closeTab(pane.id, tabId);
      return;
    }
    removeColumn(pane.id);
  }, [closeTab, removeColumn]);

  const moveTabAcrossPanes = useCallback((toPaneId: string) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    if (drag.fromPaneId === toPaneId) return;

    setPanes((current) => activateTabInPane(current, toPaneId, drag.tabId));
  }, []);

  const startPaneDrag = useCallback((event: React.DragEvent<HTMLButtonElement>, fromIndex: number) => {
    dragPaneStateRef.current = { fromIndex };
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const endPaneDrag = useCallback(() => {
    dragPaneStateRef.current = null;
    setDragOverPaneIndex(null);
  }, []);

  const movePane = useCallback((toIndex: number) => {
    const drag = dragPaneStateRef.current;
    if (!drag) return;
    if (drag.fromIndex === toIndex) return;

    setPanes((current) => {
      if (drag.fromIndex < 0 || drag.fromIndex >= current.length) return current;
      if (toIndex < 0 || toIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(drag.fromIndex, 1);
      if (!moved) return current;
      const insertIndex = drag.fromIndex < toIndex
        ? Math.min(toIndex, next.length)
        : toIndex;
      next.splice(insertIndex, 0, moved);
      dragPaneStateRef.current = { fromIndex: insertIndex };
      return next;
    });
  }, []);

  const paneTemplateStyle = useMemo(() => {
    const total = panes.reduce((sum, pane) => sum + pane.width, 0) || 100;
    return panes.map((pane) => ({
      ...pane,
      widthPercent: (pane.width / total) * 100,
    }));
  }, [panes]);

  return (
    <div className="flow-workbench-shell flex flex-col gap-2">
      <div className="flow-workbench-toolbar flex items-center justify-end">
        <div className="flow-workbench-toolbar-actions flex flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={addColumn}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <IconLayoutColumns size={14} />
            <span>Add column</span>
          </button>
          <button
            type="button"
            onClick={resetLayout}
            className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
          >
            <IconRefresh size={14} />
            <span>Reset split</span>
          </button>
          <button
            type="button"
            onClick={() => setPlaygroundOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
          >
            <IconPlayerPlay size={14} />
            <span>{playgroundOpen ? 'Hide playground' : 'Playground'}</span>
          </button>
        </div>
      </div>

      <div ref={rootRef} className="flow-workbench-multipane">
        {paneTemplateStyle.map((pane, index) => (
          <Fragment key={pane.id}>
            <div
              className={`flow-workbench-pane${dragOverPaneIndex === index ? ' is-pane-dragover' : ''}`}
              style={{ flexBasis: `${pane.widthPercent}%` }}
              onDragOver={(event) => {
                if (!dragPaneStateRef.current) return;
                event.preventDefault();
                if (dragOverPaneIndex !== index) setDragOverPaneIndex(index);
              }}
              onDrop={(event) => {
                if (!dragPaneStateRef.current) return;
                event.preventDefault();
                movePane(index);
                endPaneDrag();
              }}
            >
              <div
                className="flow-workbench-pane-tabs"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  moveTabAcrossPanes(pane.id);
                }}
              >
                <button
                  type="button"
                  aria-label="Move column"
                  title="Drag to move column"
                  draggable
                  onDragStart={(event) => startPaneDrag(event, index)}
                  onDragEnd={endPaneDrag}
                  className="flow-workbench-pane-grip"
                />
                <div className="flow-workbench-tab-list">
                  {pane.tabs.map((tabId) => (
                    <div
                      key={`${pane.id}-${tabId}`}
                      className={`flow-workbench-tab${pane.activeTab === tabId ? ' is-active' : ''}`}
                      draggable
                      onDragStart={(event) => {
                        dragStateRef.current = { tabId, fromPaneId: pane.id };
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        dragStateRef.current = null;
                      }}
                    >
                      <button
                        type="button"
                        className="flow-workbench-tab-button"
                        onClick={() => setActiveTab(pane.id, tabId)}
                      >
                        {tabLabel(tabId)}
                      </button>
                      <button
                        type="button"
                        aria-label={`Close ${tabLabel(tabId)} tab`}
                        className="flow-workbench-tab-close"
                        onClick={() => closeTabOrColumn(pane, tabId)}
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flow-workbench-pane-actions flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add tab"
                    onClick={() => addTabToPane(pane.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
                  >
                    <IconPlus size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove column"
                    onClick={() => removeColumn(pane.id)}
                    disabled={panes.length <= 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </div>

              <div className="flow-workbench-pane-content">
                {renderTabContent(pane.activeTab, flowName, codeDraft, setCodeDraft)}
              </div>
            </div>

            {index < paneTemplateStyle.length - 1 && (
              <div
                key={`${pane.id}-resizer`}
                className={`flow-workbench-resizer${activeResizerIndex === index ? ' is-active' : ''}`}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize pane"
                onPointerDown={(event) => startResize(index, event)}
              />
            )}
          </Fragment>
        ))}
      </div>
      {playgroundOpen ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Playground mode is enabled. Inline run output will be connected to backend execution streams.
        </div>
      ) : null}
    </div>
  );
}
