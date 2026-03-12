import { Fragment, forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  IconDotsVertical,
  IconLayoutColumns,
  IconX,
} from '@tabler/icons-react';
import { Splitter } from '@ark-ui/react/splitter';
import {
  MenuContent,
  MenuItem,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuTrigger,
} from '@/components/ui/menu';

import {
  activateTabInPane,
  closeTabInPane,
  normalizePaneWidths,
  removeTabFromAll,
  setActiveTabInPane,
  type Pane,
} from './workbenchState';
import './Workbench.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export type WorkbenchTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

export type WorkbenchHandle = {
  addTab: (tabId: string, paneId?: string) => void;
  removeTab: (tabId: string) => void;
  toggleTab: (tabId: string, paneId?: string) => void;
  getPanes: () => readonly Pane[];
  getFocusedPaneId: () => string | null;
};

export type WorkbenchProps = {
  tabs: WorkbenchTab[];
  defaultPanes: Pane[];
  saveKey: string;
  renderContent: (tabId: string) => React.ReactNode;
  toolbarActions?: React.ReactNode;
  hideToolbar?: boolean;
  /** Return a label for dynamic tab IDs not in the static `tabs` array, or null to reject. */
  dynamicTabLabel?: (tabId: string) => string | null;
  /** Called whenever panes change. */
  onPanesChange?: (panes: readonly Pane[]) => void;
  /** Pure transform applied after every pane mutation (e.g. enforce tab caps). */
  transformPanes?: (panes: Pane[]) => Pane[];
  /** Maximum number of columns (panes). Splitting is blocked when at the limit. */
  maxColumns?: number;
  /** Maximum number of tabs per pane. Adding tabs beyond this is blocked. */
  maxTabsPerPane?: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_PANE_PERCENT = 18;
const DRAG_PAYLOAD_MIME = 'application/x-workbench-drag';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type DragTabState = {
  tabId: string;
  fromPaneId: string;
};

type DragPaneState = {
  fromIndex: number;
};

type PointerPaneState = {
  fromIndex: number;
};

type DragPayload =
  | { kind: 'pane'; fromIndex: number }
  | { kind: 'tab'; tabId: string; fromPaneId: string };

type PersistedPane = {
  id: string;
  tabs: string[];
  activeTab: string;
  width: number;
  minWidth?: number;
  maxTabs?: number;
};

function createPaneId(input: Pane[]): string {
  const max = input.reduce((acc, pane) => {
    const match = /^pane-(\d+)$/.exec(pane.id);
    const value = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `pane-${max + 1}`;
}

function parseDragPayload(raw: string, isValidTab: (tabId: string) => boolean): DragPayload | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith('pane:')) {
    const fromIndex = Number.parseInt(value.slice('pane:'.length), 10);
    if (!Number.isFinite(fromIndex)) return null;
    return { kind: 'pane', fromIndex };
  }

  if (value.startsWith('tab:')) {
    const segments = value.split(':');
    const fromPaneId = segments[1];
    const tabIdRaw = segments.slice(2).join(':');
    if (!fromPaneId || !tabIdRaw || !isValidTab(tabIdRaw)) return null;
    return { kind: 'tab', fromPaneId, tabId: tabIdRaw };
  }

  return null;
}

function readDragPayload(dataTransfer: DataTransfer | null | undefined, isValidTab: (tabId: string) => boolean): DragPayload | null {
  if (!dataTransfer) return null;
  const custom = dataTransfer.getData(DRAG_PAYLOAD_MIME);
  const parsedCustom = parseDragPayload(custom, isValidTab);
  if (parsedCustom) return parsedCustom;

  const plain = dataTransfer.getData('text/plain');
  return parseDragPayload(plain, isValidTab);
}

function readPersistedPanes(saveKey: string, isValidTab: (tabId: string) => boolean, fallbackTab: string): Pane[] | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(saveKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedPane[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const normalized = parsed.map((item, index): Pane => {
      const tabs = Array.from(
        new Set((item.tabs ?? []).filter((candidate) => isValidTab(candidate))),
      );
      const resolvedTabs = tabs.length > 0 ? tabs : [fallbackTab];
      const resolvedActive = isValidTab(item.activeTab) && resolvedTabs.includes(item.activeTab)
        ? item.activeTab
        : resolvedTabs[0];

      return {
        id: item.id || `pane-${index + 1}`,
        tabs: resolvedTabs,
        activeTab: resolvedActive,
        width: Number.isFinite(item.width) && item.width > 0 ? item.width : 100 / parsed.length,
        ...(Number.isFinite(item.minWidth) && item.minWidth! > 0 ? { minWidth: item.minWidth } : {}),
        ...(Number.isFinite(item.maxTabs) && item.maxTabs! > 0 ? { maxTabs: item.maxTabs } : {}),
      };
    });

    return normalizePaneWidths(normalized);
  } catch {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Workbench = forwardRef<WorkbenchHandle, WorkbenchProps>(function Workbench({ tabs, defaultPanes, saveKey, renderContent, toolbarActions, hideToolbar = false, dynamicTabLabel, onPanesChange, transformPanes, maxColumns, maxTabsPerPane }, ref) {
  const fallbackTab = tabs[0]?.id ?? '';

  const staticTabIds = useMemo(() => new Set(tabs.map((tab) => tab.id)), [tabs]);
  const isValidTab = useCallback(
    (tabId: string) => staticTabIds.has(tabId) || (dynamicTabLabel?.(tabId) != null),
    [staticTabIds, dynamicTabLabel],
  );
  const tabLabelMap = useMemo(() => new Map(tabs.map((tab) => [tab.id, tab.label])), [tabs]);
  const tabLabel = useCallback(
    (tabId: string) => tabLabelMap.get(tabId) ?? dynamicTabLabel?.(tabId) ?? tabId,
    [tabLabelMap, dynamicTabLabel],
  );

  const dragStateRef = useRef<DragTabState | null>(null);
  const dragPaneStateRef = useRef<DragPaneState | null>(null);
  const pointerPaneStateRef = useRef<PointerPaneState | null>(null);

  const [panes, setPanesRaw] = useState<Pane[]>(() => defaultPanes);
  const [focusedPaneId, setFocusedPaneId] = useState<string | null>(null);
  const [dragOverPaneIndex, setDragOverPaneIndex] = useState<number | null>(null);

  const setPanes = useCallback((updater: Pane[] | ((current: Pane[]) => Pane[])) => {
    setPanesRaw((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return transformPanes ? transformPanes(next) : next;
    });
  }, [transformPanes]);

  // ── onPanesChange notification ─────────────────────────────────────────

  useEffect(() => {
    onPanesChange?.(panes);
  }, [panes, onPanesChange]);

  // ── Imperative handle ──────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    addTab(tabId: string, paneId?: string) {
      const targetPaneId = paneId ?? focusedPaneId ?? panes[panes.length - 1]?.id;
      if (!targetPaneId) return;
      setFocusedPaneId(targetPaneId);
      setPanes((current) => activateTabInPane(current, targetPaneId, tabId, fallbackTab));
    },
    removeTab(tabId: string) {
      setPanes((current) => removeTabFromAll(current, tabId, fallbackTab));
    },
    toggleTab(tabId: string, paneId?: string) {
      const isOpen = panes.some((p) => p.tabs.includes(tabId));
      if (isOpen) {
        setPanes((current) => removeTabFromAll(current, tabId, fallbackTab));
      } else {
        const targetPaneId = paneId ?? focusedPaneId ?? panes[panes.length - 1]?.id;
        if (!targetPaneId) return;
        setFocusedPaneId(targetPaneId);
        setPanes((current) => activateTabInPane(current, targetPaneId, tabId, fallbackTab));
      }
    },
    getPanes() {
      return panes;
    },
    getFocusedPaneId() {
      return focusedPaneId;
    },
  }), [panes, focusedPaneId, fallbackTab, setPanes]);

  // ── localStorage hydration ──────────────────────────────────────────────

  useEffect(() => {
    const persisted = readPersistedPanes(saveKey, isValidTab, fallbackTab);
    if (persisted && persisted.length > 0) {
      setPanes(persisted);
      setFocusedPaneId(persisted[0]?.id ?? null);
      return;
    }
    setPanes(defaultPanes);
    setFocusedPaneId(defaultPanes[0]?.id ?? null);
  }, [saveKey, isValidTab, fallbackTab, defaultPanes]);

  // ── localStorage persistence ────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = panes.map((pane): PersistedPane => ({
      id: pane.id,
      tabs: pane.tabs,
      activeTab: pane.activeTab,
      width: pane.width,
      ...(pane.minWidth != null ? { minWidth: pane.minWidth } : {}),
      ...(pane.maxTabs != null ? { maxTabs: pane.maxTabs } : {}),
    }));
    window.localStorage.setItem(saveKey, JSON.stringify(payload));
  }, [panes, saveKey]);

  // ── Focused pane sync ───────────────────────────────────────────────────

  useEffect(() => {
    if (panes.length === 0) {
      setFocusedPaneId(null);
      return;
    }
    if (!focusedPaneId || !panes.some((pane) => pane.id === focusedPaneId)) {
      setFocusedPaneId(panes[0].id);
    }
  }, [focusedPaneId, panes]);

  // ── Pane operations ─────────────────────────────────────────────────────

  const removeColumn = useCallback((paneId: string) => {
    setPanes((current) => {
      if (current.length <= 1) return current;
      const filtered = current.filter((pane) => pane.id !== paneId);
      if (filtered.length === current.length) return current;
      return normalizePaneWidths(filtered);
    });
  }, []);

  const movePaneByOffset = useCallback((paneId: string, offset: number) => {
    setPanes((current) => {
      const fromIndex = current.findIndex((pane) => pane.id === paneId);
      if (fromIndex < 0) return current;
      const toIndex = fromIndex + offset;
      if (toIndex < 0 || toIndex >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return current;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const splitPanel = useCallback((panelIndex: number) => {
    let createdPaneId: string | null = null;
    setPanes((current) => {
      if (maxColumns && current.length >= maxColumns) return current;
      const panel = current[panelIndex];
      if (!panel) return current;

      if (panel.tabs.length <= 1) {
        createdPaneId = createPaneId(current);
        const duplicatedTab = panel.activeTab;
        const next = [...current];
        next.splice(panelIndex + 1, 0, {
          id: createdPaneId,
          tabs: [duplicatedTab],
          activeTab: duplicatedTab,
          width: panel.width,
        });
        return normalizePaneWidths(next);
      }

      const activeTabIndex = panel.tabs.findIndex((tab) => tab === panel.activeTab);
      if (activeTabIndex < 0) return current;

      const movedTab = panel.tabs[activeTabIndex];
      const remainingTabs = panel.tabs.filter((_, index) => index !== activeTabIndex);
      if (remainingTabs.length === 0) return current;

      const nextActive = remainingTabs[activeTabIndex - 1] ?? remainingTabs[activeTabIndex] ?? remainingTabs[0];
      createdPaneId = createPaneId(current);
      const next = [...current];
      next[panelIndex] = {
        ...panel,
        tabs: remainingTabs,
        activeTab: nextActive,
      };
      next.splice(panelIndex + 1, 0, {
        id: createdPaneId,
        tabs: [movedTab],
        activeTab: movedTab,
        width: panel.width,
      });
      return normalizePaneWidths(next);
    });

    if (createdPaneId) {
      setFocusedPaneId(createdPaneId);
    }
  }, [maxColumns]);

  const closeAllPanelsInPane = useCallback((paneId: string) => {
    setPanes((current) => current.map((pane) => {
      if (pane.id !== paneId) return pane;
      return {
        ...pane,
        tabs: [fallbackTab],
        activeTab: fallbackTab,
      };
    }));
  }, [fallbackTab]);

  const setActiveTab = useCallback((paneId: string, tabId: string) => {
    setFocusedPaneId(paneId);
    setPanes((current) => setActiveTabInPane(current, paneId, tabId));
  }, []);

  const closeTab = useCallback((paneId: string, tabId: string) => {
    setPanes((current) => closeTabInPane(current, paneId, tabId, fallbackTab));
  }, [fallbackTab]);

  const closeTabOrColumn = useCallback((pane: Pane, tabId: string) => {
    if (pane.tabs.length > 1) {
      closeTab(pane.id, tabId);
      return;
    }
    removeColumn(pane.id);
  }, [closeTab, removeColumn]);

  const openPanelFromToolbar = useCallback((tabId: string) => {
    const existingPane = panes.find((pane) => pane.tabs.includes(tabId));
    if (existingPane) {
      setFocusedPaneId(existingPane.id);
      setPanes((current) => setActiveTabInPane(current, existingPane.id, tabId));
      return;
    }

    const targetPaneId = focusedPaneId && panes.some((pane) => pane.id === focusedPaneId)
      ? focusedPaneId
      : panes[0]?.id;
    if (!targetPaneId) return;

    setFocusedPaneId(targetPaneId);
    setPanes((current) => activateTabInPane(current, targetPaneId, tabId, fallbackTab, maxTabsPerPane));
  }, [focusedPaneId, panes, fallbackTab]);

  // ── Drag-and-drop: tabs ─────────────────────────────────────────────────

  const moveTabAcrossPanes = useCallback((toPaneId: string, dragInput?: DragTabState | null) => {
    const drag = dragInput ?? dragStateRef.current;
    if (!drag) return;
    if (drag.fromPaneId === toPaneId) return;

    setFocusedPaneId(toPaneId);
    setPanes((current) => activateTabInPane(current, toPaneId, drag.tabId, fallbackTab, maxTabsPerPane));
  }, [fallbackTab]);

  // ── Drag-and-drop: panes ────────────────────────────────────────────────

  const endPaneDrag = useCallback(() => {
    pointerPaneStateRef.current = null;
    dragPaneStateRef.current = null;
    setDragOverPaneIndex(null);
  }, []);

  const endPointerPaneDrag = useCallback(() => {
    pointerPaneStateRef.current = null;
    dragPaneStateRef.current = null;
    setDragOverPaneIndex(null);
  }, []);

  const startPointerPaneDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>, fromIndex: number) => {
    if (event.button !== 0) return;
    pointerPaneStateRef.current = { fromIndex };
    dragPaneStateRef.current = { fromIndex };
    dragStateRef.current = null;
    setDragOverPaneIndex(fromIndex);
    event.preventDefault();
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePointerMove = (event: PointerEvent) => {
      const pointerDrag = pointerPaneStateRef.current;
      if (!pointerDrag) return;

      const paneCandidate = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((element) => element instanceof HTMLElement && element.dataset.workbenchPaneIndex !== undefined);
      if (!(paneCandidate instanceof HTMLElement)) return;

      const paneIndex = Number.parseInt(paneCandidate.dataset.workbenchPaneIndex ?? '', 10);
      if (!Number.isFinite(paneIndex) || paneIndex < 0) return;

      if (pointerDrag.fromIndex === paneIndex) {
        setDragOverPaneIndex((current) => (current === paneIndex ? current : paneIndex));
        return;
      }

      dragPaneStateRef.current = { fromIndex: pointerDrag.fromIndex };
      movePane(paneIndex);
      pointerPaneStateRef.current = { fromIndex: paneIndex };
      setDragOverPaneIndex(paneIndex);
    };

    const handlePointerEnd = () => {
      if (!pointerPaneStateRef.current) return;
      endPointerPaneDrag();
    };

    const handleWindowBlur = () => {
      if (!pointerPaneStateRef.current) return;
      endPointerPaneDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [endPointerPaneDrag, movePane]);

  const handlePaneDragOver = useCallback((event: React.DragEvent, paneIndex: number) => {
    const payload = readDragPayload(event.dataTransfer, isValidTab);
    if (!payload && !dragPaneStateRef.current && !dragStateRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    if (payload?.kind === 'pane') {
      dragPaneStateRef.current = { fromIndex: payload.fromIndex };
    }

    if (dragOverPaneIndex !== paneIndex) {
      setDragOverPaneIndex(paneIndex);
    }
  }, [dragOverPaneIndex, isValidTab]);

  const handlePaneDrop = useCallback((event: React.DragEvent, paneIndex: number, paneId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const payload = readDragPayload(event.dataTransfer, isValidTab);
    if (payload?.kind === 'pane') {
      dragPaneStateRef.current = { fromIndex: payload.fromIndex };
      movePane(paneIndex);
      endPaneDrag();
      return;
    }

    if (dragPaneStateRef.current) {
      movePane(paneIndex);
      endPaneDrag();
      return;
    }

    if (payload?.kind === 'tab') {
      const drag = { tabId: payload.tabId, fromPaneId: payload.fromPaneId };
      moveTabAcrossPanes(paneId, drag);
      dragStateRef.current = null;
      setDragOverPaneIndex(null);
      return;
    }

    moveTabAcrossPanes(paneId, dragStateRef.current);
    dragStateRef.current = null;
    setDragOverPaneIndex(null);
  }, [endPaneDrag, movePane, moveTabAcrossPanes, isValidTab]);

  // ── Derived state ───────────────────────────────────────────────────────

  const paneTemplateStyle = useMemo(() => {
    const total = panes.reduce((sum, pane) => sum + pane.width, 0) || 100;
    return panes.map((pane) => ({
      ...pane,
      widthPercent: (pane.width / total) * 100,
    }));
  }, [panes]);

  const splitterPanels = useMemo(
    () => paneTemplateStyle.map((pane) => ({ id: pane.id, minSize: pane.minWidth ?? MIN_PANE_PERCENT })),
    [paneTemplateStyle],
  );

  const openPanels = useMemo(() => {
    const values = new Set<string>();
    panes.forEach((pane) => pane.tabs.forEach((tabId) => values.add(tabId)));
    return values;
  }, [panes]);

  const focusedPane = useMemo(
    () => panes.find((pane) => pane.id === focusedPaneId) ?? panes[0] ?? null,
    [focusedPaneId, panes],
  );

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="workbench-shell flex flex-col gap-2">
      {!hideToolbar && (
        <div className="workbench-toolbar">
          <div className="workbench-toolbar-panels" role="toolbar" aria-label="Panels">
            {tabs.map((tab) => {
              const isOpen = openPanels.has(tab.id);
              const isActiveInFocusedPane = focusedPane?.activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`workbench-panel-button${isOpen ? ' is-open' : ''}${isActiveInFocusedPane ? ' is-focused' : ''}`}
                  onClick={() => openPanelFromToolbar(tab.id)}
                >
                  <tab.icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {toolbarActions ? (
            <div className="workbench-toolbar-actions">
              {toolbarActions}
            </div>
          ) : null}
        </div>
      )}

      <Splitter.Root
        className="workbench-multipane"
        orientation="horizontal"
        panels={splitterPanels}
        size={paneTemplateStyle.map((pane) => pane.widthPercent)}
        onResize={({ size }) => {
          setPanes((current) => {
            if (!Array.isArray(size) || size.length !== current.length) return current;
            const next = current.map((pane, index) => {
              const width = size[index];
              return {
                ...pane,
                width: Number.isFinite(width) ? width : pane.width,
              };
            });
            return normalizePaneWidths(next);
          });
        }}
      >
        {paneTemplateStyle.map((pane, index) => (
          <Fragment key={pane.id}>
            <Splitter.Panel
              id={pane.id}
              data-workbench-pane-index={index}
              className={`workbench-pane${dragOverPaneIndex === index ? ' is-pane-dragover' : ''}`}
              onPointerDown={() => setFocusedPaneId(pane.id)}
              onDragOver={(event) => handlePaneDragOver(event, index)}
              onDrop={(event) => handlePaneDrop(event, index, pane.id)}
            >
              <div
                className="workbench-pane-tabs"
                onDragOver={(event) => handlePaneDragOver(event, index)}
                onDrop={(event) => handlePaneDrop(event, index, pane.id)}
              >
                <button
                  type="button"
                  aria-label="Move column"
                  title="Drag to move column"
                  draggable
                  onDragStart={(event) => {
                    dragPaneStateRef.current = { fromIndex: index };
                    dragStateRef.current = null;
                    event.dataTransfer.effectAllowed = 'move';
                    const payload = `pane:${index}`;
                    event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
                    event.dataTransfer.setData('text/plain', payload);
                    setDragOverPaneIndex(index);
                  }}
                  onDragEnd={endPaneDrag}
                  onPointerDown={(event) => startPointerPaneDrag(event, index)}
                  onPointerUp={endPointerPaneDrag}
                  onPointerCancel={endPointerPaneDrag}
                  className="workbench-pane-grip"
                />
                <div className="workbench-tab-list">
                  {pane.tabs.map((tabId) => (
                    <div
                      key={`${pane.id}-${tabId}`}
                      className={`workbench-tab${pane.activeTab === tabId ? ' is-active' : ''}`}
                      draggable
                      onDragStart={(event) => {
                        dragStateRef.current = { tabId, fromPaneId: pane.id };
                        dragPaneStateRef.current = null;
                        event.dataTransfer.effectAllowed = 'move';
                        const payload = `tab:${pane.id}:${tabId}`;
                        event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
                        event.dataTransfer.setData('text/plain', payload);
                      }}
                      onDragEnd={() => {
                        dragStateRef.current = null;
                      }}
                    >
                      <button
                        type="button"
                        className="workbench-tab-button"
                        onClick={() => setActiveTab(pane.id, tabId)}
                      >
                        {tabLabel(tabId)}
                      </button>
                      <button
                        type="button"
                        aria-label={`Close ${tabLabel(tabId)} tab`}
                        className="workbench-tab-close"
                        onClick={() => closeTabOrColumn(pane, tabId)}
                      >
                        <IconX size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="workbench-pane-actions">
                  <button
                    type="button"
                    title="Split panel"
                    aria-label="Split panel"
                    onClick={() => splitPanel(index)}
                    className="workbench-pane-split-trigger"
                  >
                    <IconLayoutColumns size={14} />
                  </button>

                  <MenuRoot positioning={{ placement: 'bottom-end', offset: { mainAxis: 6 } }}>
                    <MenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Pane actions"
                        className="workbench-pane-menu-trigger"
                      >
                        <IconDotsVertical size={14} />
                      </button>
                    </MenuTrigger>
                    <MenuPortal>
                      <MenuPositioner>
                        <MenuContent>
                          <MenuItem
                            value={`${pane.id}-move-right`}
                            onClick={() => movePaneByOffset(pane.id, 1)}
                            disabled={index >= panes.length - 1}
                          >
                            Move right
                          </MenuItem>
                          <MenuItem
                            value={`${pane.id}-move-left`}
                            onClick={() => movePaneByOffset(pane.id, -1)}
                            disabled={index <= 0}
                          >
                            Move left
                          </MenuItem>
                          <MenuItem
                            value={`${pane.id}-close-all`}
                            onClick={() => closeAllPanelsInPane(pane.id)}
                          >
                            Close all panels
                          </MenuItem>
                          <MenuItem
                            value={`${pane.id}-remove`}
                            onClick={() => removeColumn(pane.id)}
                            disabled={panes.length <= 1}
                          >
                            Remove pane
                          </MenuItem>
                        </MenuContent>
                      </MenuPositioner>
                    </MenuPortal>
                  </MenuRoot>
                </div>
              </div>

              <div
                className="workbench-pane-content"
                onDragOver={(event) => handlePaneDragOver(event, index)}
                onDrop={(event) => handlePaneDrop(event, index, pane.id)}
              >
                {renderContent(pane.activeTab)}
              </div>
            </Splitter.Panel>

            {index < paneTemplateStyle.length - 1 && (
              <Splitter.ResizeTrigger
                key={`${pane.id}-resizer`}
                id={`${pane.id}:${paneTemplateStyle[index + 1].id}`}
                aria-label="Resize pane"
                className="workbench-resizer"
              >
                <Splitter.ResizeTriggerIndicator
                  id={`${pane.id}:${paneTemplateStyle[index + 1].id}`}
                  className="workbench-resizer-indicator"
                />
              </Splitter.ResizeTrigger>
            )}
          </Fragment>
        ))}
      </Splitter.Root>
    </div>
  );
});
