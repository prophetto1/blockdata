import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconLayoutColumns, IconPlus, IconRefresh, IconX } from '@tabler/icons-react';
import FlowCanvas from './FlowCanvas';

type FlowWorkbenchProps = {
  flowId: string;
  flowName: string;
};

type PaneTabId = 'topology' | 'documentation' | 'files' | 'nocode' | 'executions';

type Pane = {
  id: string;
  tabs: PaneTabId[];
  activeTab: PaneTabId;
  width: number;
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

const TAB_META: Array<{ id: PaneTabId; label: string }> = [
  { id: 'topology', label: 'Topology' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'files', label: 'Files' },
  { id: 'nocode', label: 'No-code' },
  { id: 'executions', label: 'Executions' },
];

const MIN_PANE_PERCENT = 18;

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
  return TAB_META.find((item) => !existing.includes(item.id))?.id ?? 'documentation';
}

function tabLabel(tabId: PaneTabId): string {
  return TAB_META.find((item) => item.id === tabId)?.label ?? tabId;
}

function fallbackTab(): PaneTabId {
  return 'documentation';
}

function renderTabContent(tabId: PaneTabId, flowName: string, flowId: string) {
  switch (tabId) {
    case 'topology':
      return <FlowCanvas />;
    case 'documentation':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Documentation</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Shared contract notes for {flowName}.
          </p>
        </div>
      );
    case 'files':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Files</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">No files yet for this flow.</p>
        </div>
      );
    case 'nocode':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No-code</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">No-code form shell placeholder.</p>
        </div>
      );
    case 'executions':
      return (
        <div className="space-y-2 p-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Executions</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Flow ID: {flowId}</p>
        </div>
      );
    default:
      return null;
  }
}

export default function FlowWorkbench({ flowId, flowName }: FlowWorkbenchProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const nextPaneIdRef = useRef(3);
  const dragStateRef = useRef<DragTabState | null>(null);

  const [panes, setPanes] = useState<Pane[]>([
    { id: 'pane-1', tabs: ['topology', 'documentation'], activeTab: 'topology', width: 52 },
    { id: 'pane-2', tabs: ['nocode'], activeTab: 'nocode', width: 48 },
  ]);
  const [activeResizerIndex, setActiveResizerIndex] = useState<number | null>(null);

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
      if (current.length >= 4) return current;

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
    setPanes((current) => current.map((pane) => {
      if (pane.id !== paneId) return pane;
      const nextTab = getNextTab(pane.tabs);
      if (pane.tabs.includes(nextTab)) {
        return { ...pane, activeTab: nextTab };
      }
      return {
        ...pane,
        tabs: [...pane.tabs, nextTab],
        activeTab: nextTab,
      };
    }));
  }, []);

  const setActiveTab = useCallback((paneId: string, tabId: PaneTabId) => {
    setPanes((current) => current.map((pane) => (
      pane.id === paneId ? { ...pane, activeTab: tabId } : pane
    )));
  }, []);

  const moveTabAcrossPanes = useCallback((toPaneId: string) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    if (drag.fromPaneId === toPaneId) return;

    setPanes((current) => {
      let changed = false;
      const next = current.map((pane) => {
        if (pane.id === drag.fromPaneId) {
          if (!pane.tabs.includes(drag.tabId)) return pane;
          changed = true;
          const remaining = pane.tabs.filter((tab) => tab !== drag.tabId);
          const resolvedTabs = remaining.length > 0 ? remaining : [fallbackTab()];
          const activeTab = resolvedTabs.includes(pane.activeTab) ? pane.activeTab : resolvedTabs[0];
          return {
            ...pane,
            tabs: resolvedTabs,
            activeTab,
          };
        }

        if (pane.id === toPaneId) {
          changed = true;
          if (pane.tabs.includes(drag.tabId)) {
            return {
              ...pane,
              activeTab: drag.tabId,
            };
          }
          return {
            ...pane,
            tabs: [...pane.tabs, drag.tabId],
            activeTab: drag.tabId,
          };
        }

        return pane;
      });

      return changed ? next : current;
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
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <IconLayoutColumns size={14} />
            <span>Add column</span>
          </button>
          <button
            type="button"
            onClick={resetLayout}
            className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-300/80 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700/80 dark:hover:bg-slate-800"
          >
            <IconRefresh size={14} />
            <span>Reset split</span>
          </button>
        </div>
      </div>

      <div ref={rootRef} className="flow-workbench-multipane">
        {paneTemplateStyle.map((pane, index) => (
          <Fragment key={pane.id}>
            <div
              className="flow-workbench-pane"
              style={{ flexBasis: `${pane.widthPercent}%` }}
            >
              <div
                className="flow-workbench-pane-tabs"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  moveTabAcrossPanes(pane.id);
                }}
              >
                <div className="flow-workbench-tab-list">
                  {pane.tabs.map((tabId) => (
                    <button
                      type="button"
                      key={`${pane.id}-${tabId}`}
                      className={`flow-workbench-tab${pane.activeTab === tabId ? ' is-active' : ''}`}
                      onClick={() => setActiveTab(pane.id, tabId)}
                      draggable
                      onDragStart={(event) => {
                        dragStateRef.current = { tabId, fromPaneId: pane.id };
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        dragStateRef.current = null;
                      }}
                    >
                      {tabLabel(tabId)}
                    </button>
                  ))}
                </div>

                <div className="flow-workbench-pane-actions flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Add tab"
                    onClick={() => addTabToPane(pane.id)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 hover:border-slate-300/80 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  >
                    <IconPlus size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove column"
                    onClick={() => removeColumn(pane.id)}
                    disabled={panes.length <= 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-slate-500 hover:border-slate-300/80 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              </div>

              <div className="flow-workbench-pane-content">
                {renderTabContent(pane.activeTab, flowName, flowId)}
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
    </div>
  );
}
