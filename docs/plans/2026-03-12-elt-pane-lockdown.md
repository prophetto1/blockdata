# ELT Pane Lockdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Disable drag-and-drop reordering in the ELT workbench and set the canonical layout to [assets (18% fixed), parse (18% fixed), preview (remaining)].

**Architecture:** Add a `disableDrag` prop to the generic Workbench component that suppresses all drag-and-drop interactions (pane grip drag, tab drag, pane drop targets, context menu move items). Separately, update ELT defaults and bump the localStorage save key so the new layout takes effect for all users.

**Tech Stack:** React, Ark UI Splitter (Zag.js), TypeScript, Vitest

---

### Task 1: Add `disableDrag` prop to Workbench

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx:43-62` (WorkbenchProps type)
- Modify: `web/src/components/workbench/Workbench.tsx:175` (destructure prop)

**Step 1: Add `disableDrag` to WorkbenchProps**

In `web/src/components/workbench/Workbench.tsx`, add the prop to the type:

```typescript
export type WorkbenchProps = {
  tabs: WorkbenchTab[];
  defaultPanes: Pane[];
  saveKey: string;
  renderContent: (tabId: string) => React.ReactNode;
  toolbarActions?: React.ReactNode;
  hideToolbar?: boolean;
  dynamicTabLabel?: (tabId: string) => string | null;
  onPanesChange?: (panes: readonly Pane[]) => void;
  transformPanes?: (panes: Pane[]) => Pane[];
  maxColumns?: number;
  minColumns?: number;
  maxTabsPerPane?: number;
  /** Disable all drag-and-drop (pane reorder + tab move). */
  disableDrag?: boolean;
};
```

**Step 2: Destructure `disableDrag` in the component signature**

Line 175, add `disableDrag = false` to the destructured props:

```typescript
export const Workbench = forwardRef<WorkbenchHandle, WorkbenchProps>(function Workbench({ tabs, defaultPanes, saveKey, renderContent, toolbarActions, hideToolbar = false, dynamicTabLabel, onPanesChange, transformPanes, maxColumns, minColumns, maxTabsPerPane, disableDrag = false }, ref) {
```

**Step 3: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx
git commit -m "feat(workbench): add disableDrag prop to WorkbenchProps"
```

---

### Task 2: Suppress drag on pane grip button

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx:658-677` (pane grip button)

**Step 1: Conditionally disable pane grip drag**

Replace the pane grip `<button>` (lines 658-677) with:

```tsx
<button
  type="button"
  aria-label="Move column"
  title="Drag to move column"
  draggable={!disableDrag}
  onDragStart={disableDrag ? undefined : (event) => {
    dragPaneStateRef.current = { fromIndex: index };
    dragStateRef.current = null;
    event.dataTransfer.effectAllowed = 'move';
    const payload = `pane:${index}`;
    event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
    event.dataTransfer.setData('text/plain', payload);
    setDragOverPaneIndex(index);
  }}
  onDragEnd={disableDrag ? undefined : endPaneDrag}
  onPointerDown={disableDrag ? undefined : (event) => startPointerPaneDrag(event, index)}
  onPointerUp={disableDrag ? undefined : endPointerPaneDrag}
  onPointerCancel={disableDrag ? undefined : endPointerPaneDrag}
  className="workbench-pane-grip"
/>
```

**Step 2: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx
git commit -m "feat(workbench): suppress pane grip drag when disableDrag is true"
```

---

### Task 3: Suppress drag on tab elements

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx:679-712` (tab list items)

**Step 1: Conditionally disable tab drag**

Replace the tab `<div>` wrapper (lines 680-712) with:

```tsx
<div
  key={`${pane.id}-${tabId}`}
  className={`workbench-tab${pane.activeTab === tabId ? ' is-active' : ''}`}
  draggable={!disableDrag}
  onDragStart={disableDrag ? undefined : (event) => {
    dragStateRef.current = { tabId, fromPaneId: pane.id };
    dragPaneStateRef.current = null;
    event.dataTransfer.effectAllowed = 'move';
    const payload = `tab:${pane.id}:${tabId}`;
    event.dataTransfer.setData(DRAG_PAYLOAD_MIME, payload);
    event.dataTransfer.setData('text/plain', payload);
  }}
  onDragEnd={disableDrag ? undefined : () => {
    dragStateRef.current = null;
  }}
>
```

**Step 2: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx
git commit -m "feat(workbench): suppress tab drag when disableDrag is true"
```

---

### Task 4: Suppress drop targets and drag-over handlers

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx:645-651` (Splitter.Panel)
- Modify: `web/src/components/workbench/Workbench.tsx:653-656` (pane-tabs div)
- Modify: `web/src/components/workbench/Workbench.tsx:773-776` (pane-content div)

**Step 1: Conditionally suppress all `onDragOver` and `onDrop` handlers**

On the `Splitter.Panel` (line 645):

```tsx
<Splitter.Panel
  id={pane.id}
  data-workbench-pane-index={index}
  className={`workbench-pane${dragOverPaneIndex === index ? ' is-pane-dragover' : ''}`}
  onPointerDown={() => setFocusedPaneId(pane.id)}
  onDragOver={disableDrag ? undefined : (event) => handlePaneDragOver(event, index)}
  onDrop={disableDrag ? undefined : (event) => handlePaneDrop(event, index, pane.id)}
>
```

On the `workbench-pane-tabs` div (line 653):

```tsx
<div
  className="workbench-pane-tabs"
  onDragOver={disableDrag ? undefined : (event) => handlePaneDragOver(event, index)}
  onDrop={disableDrag ? undefined : (event) => handlePaneDrop(event, index, pane.id)}
>
```

On the `workbench-pane-content` div (line 773):

```tsx
<div
  className="workbench-pane-content"
  onDragOver={disableDrag ? undefined : (event) => handlePaneDragOver(event, index)}
  onDrop={disableDrag ? undefined : (event) => handlePaneDrop(event, index, pane.id)}
>
```

**Step 2: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx
git commit -m "feat(workbench): suppress drag-over and drop targets when disableDrag is true"
```

---

### Task 5: Disable "Move right" / "Move left" context menu items

**Files:**
- Modify: `web/src/components/workbench/Workbench.tsx:739-752` (menu items)

**Step 1: Disable move menu items when `disableDrag` is true**

```tsx
<MenuItem
  value={`${pane.id}-move-right`}
  onClick={() => movePaneByOffset(pane.id, 1)}
  disabled={disableDrag || index >= panes.length - 1}
>
  Move right
</MenuItem>
<MenuItem
  value={`${pane.id}-move-left`}
  onClick={() => movePaneByOffset(pane.id, -1)}
  disabled={disableDrag || index <= 0}
>
  Move left
</MenuItem>
```

**Step 2: Commit**

```bash
git add web/src/components/workbench/Workbench.tsx
git commit -m "feat(workbench): disable move menu items when disableDrag is true"
```

---

### Task 6: Pass `disableDrag` from DocumentTest.tsx

**Files:**
- Modify: `web/src/pages/DocumentTest.tsx:97-108` (Workbench usage)

**Step 1: Add `disableDrag` to the Workbench instance**

```tsx
<Workbench
  ref={workbenchRef}
  tabs={ELT_TABS}
  defaultPanes={ELT_DEFAULT_PANES}
  saveKey="elt-document-workbench"
  renderContent={renderContent}
  dynamicTabLabel={dynamicTabLabel}
  transformPanes={transformPanes}
  onPanesChange={handlePanesChange}
  hideToolbar
  minColumns={3}
  disableDrag
/>
```

**Step 2: Commit**

```bash
git add web/src/pages/DocumentTest.tsx
git commit -m "feat(elt): enable disableDrag on ELT workbench"
```

---

### Task 7: Reorder ELT_DEFAULT_PANES and bump save key

**Files:**
- Modify: `web/src/pages/useEltWorkbench.tsx:71-75` (ELT_DEFAULT_PANES)
- Modify: `web/src/pages/DocumentTest.tsx:101` (saveKey)

**Step 1: Update ELT_DEFAULT_PANES**

In `web/src/pages/useEltWorkbench.tsx`, replace lines 71-75:

```typescript
export const ELT_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['assets'], activeTab: 'assets', width: 18, minWidth: 18, maxWidth: 18, maxTabs: 3 },
  { id: 'pane-2', tabs: ['parse'], activeTab: 'parse', width: 18, minWidth: 18, maxWidth: 18 },
  { id: 'pane-3', tabs: ['preview'], activeTab: 'preview', width: 64 },
]);
```

**Step 2: Bump the save key to invalidate stale localStorage**

In `web/src/pages/DocumentTest.tsx`, change line 101:

```tsx
saveKey="elt-document-workbench-v2"
```

This forces all users to get the new default layout instead of loading stale persisted state with the old order and no maxWidth constraints.

**Step 3: Commit**

```bash
git add web/src/pages/useEltWorkbench.tsx web/src/pages/DocumentTest.tsx
git commit -m "feat(elt): reorder panes [assets, parse, preview] with fixed 18% side columns, bump save key"
```

---

### Task 8: Verify in browser

**Step 1: Clear localStorage and reload**

Open browser dev tools → Application → Local Storage → delete any keys matching `elt-document-workbench*`. Reload the ELT page.

**Step 2: Verify layout**

- 3 columns visible: assets (left, ~18%), parse (middle, ~18%), preview (right, ~64%)
- Drag grip on pane headers does nothing (no drag cursor, no reorder)
- Tab drag does nothing
- Context menu "Move right" / "Move left" are greyed out
- Splitter resize handles between pane 1↔2 and pane 2↔3 do not allow resizing pane 1 or pane 2 beyond 18%

**Step 3: Verify no regressions**

- Clicking tabs still switches active tab within a pane
- Split panel button still works (up to maxColumns if set)
- Close tab button still works (down to minColumns=3)
- Assets toggle from toolbar still works