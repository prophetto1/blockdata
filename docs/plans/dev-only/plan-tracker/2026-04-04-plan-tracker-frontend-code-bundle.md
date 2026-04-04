# Plan Tracker Frontend Code Bundle

**Date:** 2026-04-04
**Purpose:** Collective review bundle for the current plan-tracker frontend implementation plus the existing reusable primitives that should have informed it.

## Included Files
- `web\src\pages\superuser\PlanTracker.tsx`
- `web\src\pages\superuser\usePlanTracker.tsx`
- `web\src\pages\superuser\PlanUnitsRail.tsx`
- `web\src\pages\superuser\PlanArtifactsRail.tsx`
- `web\src\pages\superuser\PlanMetadataPane.tsx`
- `web\src\pages\superuser\PlanDocumentPreview.tsx`
- `web\src\pages\superuser\MdxEditorSurface.tsx`
- `web\src\pages\superuser\WorkspaceFileTree.tsx`
- `web\src\lib\fs-access.ts`
- `web\src\components\workbench\Workbench.tsx`

## Mounted Versus Available
This distinction matters for review.

Mounted in the current tracker route:
- `web/src/pages/superuser/PlanTracker.tsx` mounts `Workbench.tsx`.
- `web/src/pages/superuser/usePlanTracker.tsx` uses `web/src/lib/fs-access.ts`.
- `web/src/pages/superuser/usePlanTracker.tsx` mounts `MdxEditorSurface.tsx` in the document pane.

Available in the repo but not currently mounted by the tracker:
- `web/src/pages/superuser/WorkspaceFileTree.tsx` exists and already provides the Ark UI / TreeView-based file-tree viewer backed by the File System Access API.

Why that difference matters:
- The current tracker is filesystem-backed in behavior, but the filesystem is not legible enough in the UI because the existing file-tree primitive was not composed into the route.
- This is not because the capability is missing. The code already exists in the repo. It was not included in the mounted tracker surface.

## File Tree / File System Access Assessment
No: the current mounted plan tracker does not include the existing Ark UI file-tree viewer utility in its UI.

What is included in the mounted route:
- `Workbench.tsx` as the four-pane shell.
- `fs-access.ts` through the `usePlanTracker.tsx` data and save flows.
- `MdxEditorSurface.tsx` for the document editor.

What is not included in the mounted route:
- `WorkspaceFileTree.tsx` is not imported or mounted by `PlanTracker.tsx` or `usePlanTracker.tsx`.
- The current tracker uses custom derived rails instead of the existing Ark UI tree-based file browser.

Why it is not included:
- Implementation drift. The tracker was composed around custom plan/artifact rails instead of reusing the existing `WorkspaceFileTree.tsx` primitive.
- There is no identified technical blocker preventing reuse; it was a composition decision, not a missing capability.

## web\src\pages\superuser\PlanTracker.tsx

```tsx
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Workbench } from '@/components/workbench/Workbench';

import {
  PLAN_TRACKER_DEFAULT_PANES,
  PLAN_TRACKER_TABS,
  usePlanTracker,
} from './usePlanTracker';

export function Component() {
  useShellHeaderTitle({ title: 'Plan Tracker', breadcrumbs: ['Superuser'] });

  const tracker = usePlanTracker();

  return (
    <div className="h-full w-full min-h-0 p-2" data-testid="plan-tracker-shell">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-border bg-card">
        <Workbench
          tabs={PLAN_TRACKER_TABS}
          defaultPanes={PLAN_TRACKER_DEFAULT_PANES}
          saveKey="plan-tracker-layout-v1"
          renderContent={tracker.renderContent}
          hideToolbar
          maxColumns={4}
          minColumns={4}
          maxTabsPerPane={1}
          disableDrag
          lockLayout
        />
      </div>
    </div>
  );
}

```

## web\src\pages\superuser\usePlanTracker.tsx

```tsx
/* eslint-disable react-refresh/only-export-components */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChecklist, IconFiles, IconListDetails, IconNotes } from '@tabler/icons-react';

import {
  createFile,
  type FsNode,
  pickDirectory,
  readDirectory,
  readFileContent,
  restoreDirectoryHandle,
  saveDirectoryHandle,
  writeFileContent,
} from '@/lib/fs-access';
import { normalizePaneWidths, type Pane } from '@/components/workbench/workbenchState';

import { MdxEditorSurface, type MdxViewMode } from './MdxEditorSurface';
import { PlanArtifactsRail } from './PlanArtifactsRail';
import { PlanDocumentPreview } from './PlanDocumentPreview';
import { PlanMetadataPane } from './PlanMetadataPane';
import {
  buildArtifactFilename,
  derivePlanStem,
  groupPlanDocuments,
  isTrackerMetadataComplete,
  latestPlanArtifact,
  nextArtifactSequence,
  nextVersionNumber,
  serializePlanTrackerDocument,
  workflowArtifactStatus,
  workflowArtifactTitle,
  workflowArtifactType,
  workflowPlanStatus,
  type PlanArtifactSummary,
  type PlanTrackerMetadata,
  type PlanUnit,
  type WorkflowActionId,
} from './planTrackerModel';
import { PlanUnitsRail } from './PlanUnitsRail';

export const PLAN_TRACKER_TABS = [
  { id: 'plan-units', label: 'Plans', icon: IconChecklist },
  { id: 'plan-artifacts', label: 'Artifacts', icon: IconFiles },
  { id: 'document', label: 'Document', icon: IconNotes },
  { id: 'metadata', label: 'Metadata', icon: IconListDetails },
];

export const PLAN_TRACKER_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['plan-units'], activeTab: 'plan-units', width: 24 },
  { id: 'pane-2', tabs: ['plan-artifacts'], activeTab: 'plan-artifacts', width: 24 },
  { id: 'pane-3', tabs: ['document'], activeTab: 'document', width: 32 },
  { id: 'pane-4', tabs: ['metadata'], activeTab: 'metadata', width: 20 },
]);

function flattenMarkdownNodes(nodes: FsNode[]): FsNode[] {
  const results: FsNode[] = [];

  for (const node of nodes) {
    if (node.kind === 'file' && (node.extension === '.md' || node.extension === '.mdx')) {
      results.push(node);
      continue;
    }
    if (node.kind === 'directory' && node.children) {
      results.push(...flattenMarkdownNodes(node.children));
    }
  }

  return results;
}

function findDefaultArtifact(plan: PlanUnit | null) {
  return plan?.artifacts[0] ?? null;
}

type PendingWorkflowAction = {
  actionId: WorkflowActionId;
};

type PendingActionChoice = 'save' | 'discard' | 'cancel';

type PendingActionResolution = {
  actionId: string | null;
  shouldProceed: boolean;
  resolution: PendingActionChoice;
};

type UsePlanTrackerResult = {
  planUnits: PlanUnit[];
  selectedPlan: PlanUnit | null;
  selectedArtifact: PlanArtifactSummary | null;
  documentContent: string;
  dirty: boolean;
  pendingAction: PendingWorkflowAction | null;
  loading: boolean;
  error: string;
  openPlansDirectory: () => Promise<void>;
  selectPlan: (planId: string) => void;
  selectArtifact: (artifactId: string) => void;
  setDocumentContent: (value: string) => void;
  requestWorkflowAction: (actionId: WorkflowActionId) => boolean;
  runWorkflowAction: (actionId: WorkflowActionId) => Promise<boolean>;
  resolvePendingAction: (choice: PendingActionChoice) => Promise<PendingActionResolution>;
  saveCurrentDocument: () => Promise<void>;
  renderContent: (tabId: string) => React.ReactNode;
};

function siblingPath(path: string, fileName: string) {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1 ? fileName : `${path.slice(0, lastSlash)}/${fileName}`;
}

function buildWorkflowArtifactBody(actionId: WorkflowActionId, title: string, planTitle: string) {
  switch (actionId) {
    case 'reject-with-notes':
      return `# ${title}\n\n## Summary\n\nAdd rejection notes for ${planTitle}.\n`;
    case 'approve-with-notes':
      return `# ${title}\n\n## Summary\n\nAdd approval notes for ${planTitle}.\n`;
    case 'attach-implementation-note':
      return `# ${title}\n\n## Summary\n\nDocument implementation progress for ${planTitle}.\n`;
    case 'attach-verification':
      return `# ${title}\n\n## Summary\n\nDocument verification notes for ${planTitle}.\n`;
    case 'create-revision':
      return `# ${planTitle}\n\nAdd the next revision details.\n`;
  }
}

export function usePlanTracker(storeKey = 'plan-tracker-dir'): UsePlanTrackerResult {
  const [planUnits, setPlanUnits] = useState<PlanUnit[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [documentContent, setDocumentContentState] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [fileKey, setFileKey] = useState('plan-tracker-empty');
  const [pendingAction, setPendingAction] = useState<PendingWorkflowAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode] = useState<MdxViewMode>('rich-text');

  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const artifactNodeMapRef = useRef<Map<string, FsNode>>(new Map());

  const selectedPlan = useMemo(
    () => planUnits.find((plan) => plan.planId === selectedPlanId) ?? null,
    [planUnits, selectedPlanId],
  );

  const selectedArtifact = useMemo(
    () => selectedPlan?.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ?? null,
    [selectedArtifactId, selectedPlan],
  );

  const dirty = documentContent !== originalContent;

  const syncSelection = useCallback(
    (nextPlans: PlanUnit[], preferredPlanId?: string | null, preferredArtifactId?: string | null) => {
      const nextPlan =
        nextPlans.find((plan) => plan.planId === preferredPlanId) ??
        nextPlans.find((plan) => plan.planId === selectedPlanId) ??
        nextPlans[0] ??
        null;
      const nextArtifact =
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === preferredArtifactId) ??
        nextPlan?.artifacts.find((artifact) => artifact.artifactId === selectedArtifactId) ??
        findDefaultArtifact(nextPlan);

      setSelectedPlanId(nextPlan?.planId ?? null);
      setSelectedArtifactId(nextArtifact?.artifactId ?? null);
      setDocumentContentState(nextArtifact?.content ?? '');
      setOriginalContent(nextArtifact?.content ?? '');
      setFileKey(nextArtifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [selectedArtifactId, selectedPlanId],
  );

  const loadFromHandle = useCallback(
    async (handle: FileSystemDirectoryHandle, preferredPlanId?: string | null, preferredArtifactId?: string | null) => {
      setLoading(true);
      setError('');
      directoryHandleRef.current = handle;

      try {
        const tree = await readDirectory(handle);
        const markdownNodes = flattenMarkdownNodes(tree);
        const artifactNodes = new Map<string, FsNode>();
        const documents = await Promise.all(
          markdownNodes.map(async (node) => {
            const content = await readFileContent(node.handle as FileSystemFileHandle);
            return { path: node.path, content, node };
          }),
        );

        const grouped = groupPlanDocuments(documents.map(({ path, content }) => ({ path, content })));

        for (const document of documents) {
          const pathArtifactId = `${document.path.replace(/\\/g, '/')}`;
          artifactNodes.set(pathArtifactId, document.node);
        }

        const nodeMap = new Map<string, FsNode>();
        for (const plan of grouped) {
          for (const artifact of plan.artifacts) {
            const node = documents.find((entry) => entry.path.replace(/\\/g, '/') === artifact.path)?.node;
            if (node) {
              nodeMap.set(artifact.artifactId, node);
            }
          }
        }

        artifactNodeMapRef.current = nodeMap;
        setPlanUnits(grouped);
        syncSelection(grouped, preferredPlanId, preferredArtifactId);
      } catch (err) {
        setPlanUnits([]);
        setError(err instanceof Error ? err.message : 'Failed to load plans directory');
      } finally {
        setLoading(false);
      }
    },
    [syncSelection],
  );

  useEffect(() => {
    restoreDirectoryHandle(storeKey).then(async (handle) => {
      if (!handle) {
        setLoading(false);
        return;
      }

      try {
        const permissionHandle = handle as FileSystemDirectoryHandle & {
          queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
        };
        const permission = await permissionHandle.queryPermission?.({ mode: 'readwrite' });
        if (permission === 'granted') {
          await loadFromHandle(handle);
          return;
        }
      } catch {
        // fall through to unloaded state
      }

      setLoading(false);
    });
  }, [loadFromHandle, storeKey]);

  const openPlansDirectory = useCallback(async () => {
    const handle = await pickDirectory();
    await saveDirectoryHandle(handle, storeKey);
    await loadFromHandle(handle);
  }, [loadFromHandle, storeKey]);

  const selectPlan = useCallback(
    (planId: string) => {
      const plan = planUnits.find((entry) => entry.planId === planId) ?? null;
      const artifact = findDefaultArtifact(plan);
      setSelectedPlanId(plan?.planId ?? null);
      setSelectedArtifactId(artifact?.artifactId ?? null);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [planUnits],
  );

  const selectArtifact = useCallback(
    (artifactId: string) => {
      const artifact = selectedPlan?.artifacts.find((entry) => entry.artifactId === artifactId) ?? null;
      setSelectedArtifactId(artifact?.artifactId ?? null);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [selectedPlan],
  );

  const setDocumentContent = useCallback((value: string) => {
    setDocumentContentState(value);
  }, []);

  const buildNormalizedMetadata = useCallback((
    artifact: PlanArtifactSummary,
    overrides: Partial<PlanTrackerMetadata> = {},
    planContext?: PlanUnit | null,
  ): PlanTrackerMetadata => {
    const scope = planContext ?? selectedPlan;
    const title = overrides.title ?? artifact.metadata.title ?? artifact.title;
    return {
      ...artifact.metadata,
      title,
      description:
        overrides.description ??
        artifact.metadata.description ??
        `${title} artifact for ${artifact.planId}.`,
      planId: overrides.planId ?? artifact.planId,
      artifactType: overrides.artifactType ?? artifact.artifactType,
      status: overrides.status ?? artifact.status,
      version: overrides.version ?? artifact.version,
      productArea: overrides.productArea ?? artifact.metadata.productArea ?? scope?.productArea,
      functionalArea: overrides.functionalArea ?? artifact.metadata.functionalArea ?? scope?.functionalArea,
      updatedAt: overrides.updatedAt ?? new Date().toISOString(),
      priority: overrides.priority ?? artifact.metadata.priority,
      owner: overrides.owner ?? artifact.metadata.owner,
      trackerId: overrides.trackerId ?? artifact.metadata.trackerId,
      tags: overrides.tags ?? artifact.metadata.tags,
      relatedArtifacts: overrides.relatedArtifacts ?? artifact.metadata.relatedArtifacts,
      notes: overrides.notes ?? artifact.metadata.notes,
    };
  }, [selectedPlan]);

  const writeExistingArtifact = useCallback(async (
    artifact: PlanArtifactSummary,
    metadata: PlanTrackerMetadata,
    body?: string,
  ) => {
    const node = artifactNodeMapRef.current.get(artifact.artifactId);
    if (!node || node.kind !== 'file') {
      throw new Error('Tracker artifact is not writable.');
    }

    const content = serializePlanTrackerDocument(metadata, body ?? artifact.body);
    await writeFileContent(node.handle as FileSystemFileHandle, content);
    return { node, content };
  }, []);

  const executeWorkflowAction = useCallback(async (actionId: WorkflowActionId) => {
    if (!selectedPlan || !selectedArtifact) {
      return false;
    }

    const timestamp = new Date().toISOString();
    const selectedArtifactMetadata = buildNormalizedMetadata(
      selectedArtifact,
      isTrackerMetadataComplete(selectedArtifact) ? { updatedAt: timestamp } : { updatedAt: timestamp },
      selectedPlan,
    );

    if (!isTrackerMetadataComplete(selectedArtifact)) {
      await writeExistingArtifact(selectedArtifact, selectedArtifactMetadata, documentContent);
    }

    const currentPlanArtifact =
      selectedPlan.artifacts
        .filter((artifact) => artifact.artifactType === 'plan' && artifact.version === selectedArtifact.version)
        .at(-1) ??
      latestPlanArtifact(selectedPlan.artifacts) ??
      null;

    if (actionId === 'create-revision') {
      if (!currentPlanArtifact) {
        throw new Error('No plan artifact is available to revise.');
      }

      const supersededMetadata = buildNormalizedMetadata(
        currentPlanArtifact,
        { status: 'superseded', updatedAt: timestamp },
        selectedPlan,
      );
      const currentPlanBody =
        currentPlanArtifact.artifactId === selectedArtifact.artifactId ? documentContent : currentPlanArtifact.body;
      const { node: currentPlanNode } = await writeExistingArtifact(currentPlanArtifact, supersededMetadata, currentPlanBody);
      if (!currentPlanNode.parentHandle) {
        throw new Error('Plan artifact parent directory is not writable.');
      }

      const nextVersion = nextVersionNumber(currentPlanArtifact.version);
      const fileName = buildArtifactFilename({
        planStem: derivePlanStem(currentPlanArtifact.path),
        artifactType: 'plan',
        version: nextVersion,
      });
      const newHandle = await createFile(currentPlanNode.parentHandle, fileName);
      const newMetadata = buildNormalizedMetadata(
        currentPlanArtifact,
        {
          artifactType: 'plan',
          status: workflowPlanStatus(actionId),
          version: nextVersion,
          updatedAt: timestamp,
          relatedArtifacts: [currentPlanArtifact.path],
        },
        selectedPlan,
      );
      const nextBody = currentPlanBody.trim().length > 0
        ? currentPlanBody
        : buildWorkflowArtifactBody(actionId, currentPlanArtifact.title, selectedPlan.title);
      await writeFileContent(newHandle, serializePlanTrackerDocument(newMetadata, nextBody));

      if (directoryHandleRef.current) {
        await loadFromHandle(
          directoryHandleRef.current,
          selectedPlan.planId,
          `${selectedPlan.planId}:${siblingPath(currentPlanArtifact.path, fileName)}`,
        );
      }
      return true;
    }

    const targetPlanArtifact = currentPlanArtifact ?? selectedArtifact;
    const planStatus = workflowPlanStatus(actionId);
    const artifactType = workflowArtifactType(actionId);
    const artifactVersion = targetPlanArtifact.version;
    const sequence = nextArtifactSequence(selectedPlan.artifacts, artifactType, artifactVersion);
    const artifactTitle = workflowArtifactTitle(actionId, selectedPlan.title, artifactVersion, sequence);
    const artifactBody = buildWorkflowArtifactBody(actionId, artifactTitle, selectedPlan.title);
    const artifactStatus = workflowArtifactStatus(actionId);

    const updatedPlanMetadata = buildNormalizedMetadata(
      targetPlanArtifact,
      { status: planStatus, updatedAt: timestamp },
      selectedPlan,
    );
    const targetPlanBody =
      targetPlanArtifact.artifactId === selectedArtifact.artifactId ? documentContent : targetPlanArtifact.body;
    await writeExistingArtifact(targetPlanArtifact, updatedPlanMetadata, targetPlanBody);

    const selectedArtifactNode = artifactNodeMapRef.current.get(selectedArtifact.artifactId);
    if (!selectedArtifactNode || selectedArtifactNode.kind !== 'file' || !selectedArtifactNode.parentHandle) {
      throw new Error('Selected artifact parent directory is not writable.');
    }

    const fileName = buildArtifactFilename({
      planStem: derivePlanStem(selectedArtifact.path),
      artifactType,
      version: artifactVersion,
      sequence,
    });
    const newHandle = await createFile(selectedArtifactNode.parentHandle, fileName);
    const artifactMetadata: PlanTrackerMetadata = {
      title: artifactTitle,
      description: `${artifactTitle} for ${selectedPlan.title}.`,
      planId: selectedPlan.planId,
      artifactType,
      status: artifactStatus,
      version: artifactVersion,
      productArea: selectedPlan.productArea ?? selectedArtifact.metadata.productArea,
      functionalArea: selectedPlan.functionalArea ?? selectedArtifact.metadata.functionalArea,
      updatedAt: timestamp,
      priority: selectedArtifact.metadata.priority,
      owner: selectedArtifact.metadata.owner,
      trackerId: selectedArtifact.metadata.trackerId,
      tags: selectedArtifact.metadata.tags,
      relatedArtifacts: [selectedArtifact.path],
      notes: selectedArtifact.metadata.notes,
    };
    await writeFileContent(newHandle, serializePlanTrackerDocument(artifactMetadata, artifactBody));

    if (directoryHandleRef.current) {
      await loadFromHandle(
        directoryHandleRef.current,
        selectedPlan.planId,
        `${selectedPlan.planId}:${siblingPath(selectedArtifact.path, fileName)}`,
      );
    }

    return true;
  }, [buildNormalizedMetadata, documentContent, loadFromHandle, selectedArtifact, selectedPlan, writeExistingArtifact]);

  const requestWorkflowAction = useCallback((actionId: WorkflowActionId) => {
    if (!dirty) {
      return true;
    }

    setPendingAction({ actionId });
    return false;
  }, [dirty]);

  const runWorkflowAction = useCallback(async (actionId: WorkflowActionId) => {
    if (!requestWorkflowAction(actionId)) {
      return false;
    }

    await executeWorkflowAction(actionId);
    return true;
  }, [executeWorkflowAction, requestWorkflowAction]);

  const saveCurrentDocument = useCallback(async () => {
    if (!selectedArtifact || !dirty) return;

    const node = artifactNodeMapRef.current.get(selectedArtifact.artifactId);
    if (!node || node.kind !== 'file') {
      throw new Error('Selected artifact is not writable.');
    }

    await writeFileContent(node.handle as FileSystemFileHandle, documentContent);
    setOriginalContent(documentContent);

    if (directoryHandleRef.current) {
      await loadFromHandle(directoryHandleRef.current, selectedPlan?.planId ?? null, selectedArtifact.artifactId);
    }
  }, [dirty, documentContent, loadFromHandle, selectedArtifact, selectedPlan?.planId]);

  const resolvePendingAction = useCallback(async (choice: PendingActionChoice): Promise<PendingActionResolution> => {
    const actionId = pendingAction?.actionId ?? null;
    if (!actionId) {
      return {
        actionId: null,
        shouldProceed: false,
        resolution: choice,
      };
    }

    if (choice === 'cancel') {
      setPendingAction(null);
      return {
        actionId,
        shouldProceed: false,
        resolution: 'cancel',
      };
    }

    if (choice === 'discard') {
      setDocumentContentState(originalContent);
      setPendingAction(null);
      await executeWorkflowAction(actionId);
      return {
        actionId,
        shouldProceed: true,
        resolution: 'discard',
      };
    }

    await saveCurrentDocument();
    setPendingAction(null);
    await executeWorkflowAction(actionId);
    setPendingAction(null);
    return {
      actionId,
      shouldProceed: true,
      resolution: 'save',
    };
  }, [executeWorkflowAction, originalContent, pendingAction, saveCurrentDocument]);

  const renderContent = useCallback(
    (tabId: string) => {
      if (tabId === 'plan-units') {
        if (!planUnits.length) {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading plans directoryâ€¦' : 'Open the docs/plans directory to start the tracker.'}
              </p>
              {!loading && (
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium"
                  onClick={() => void openPlansDirectory()}
                >
                  Open Plans Directory
                </button>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          );
        }

        return <PlanUnitsRail units={planUnits} selectedPlanId={selectedPlan?.planId ?? ''} onSelectPlan={selectPlan} />;
      }

      if (tabId === 'plan-artifacts') {
        if (!selectedPlan) {
          return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No plan selected.</div>;
        }

        return (
          <PlanArtifactsRail
            plan={selectedPlan}
            selectedArtifactId={selectedArtifact?.artifactId ?? ''}
            onSelectArtifact={selectArtifact}
          />
        );
      }

      if (tabId === 'document') {
        if (!selectedArtifact) {
          return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No artifact selected.</div>;
        }

        return (
          <MdxEditorSurface
            content={documentContent}
            diffMarkdown={originalContent}
            fileKey={fileKey}
            viewMode={viewMode}
            onChange={setDocumentContent}
            onSave={() => void saveCurrentDocument()}
          />
        );
      }

      if (tabId === 'metadata') {
        if (!selectedPlan || !selectedArtifact) {
          return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No metadata available.</div>;
        }

        return (
          <PlanMetadataPane
            plan={selectedPlan}
            artifact={selectedArtifact}
            dirty={dirty}
            pendingAction={pendingAction}
            onAction={(actionId) => void runWorkflowAction(actionId)}
            onResolvePendingAction={(choice) => void resolvePendingAction(choice)}
          />
        );
      }

      if (tabId === 'document-preview' && selectedArtifact) {
        return <PlanDocumentPreview title={selectedArtifact.title} markdown={documentContent} />;
      }

      return null;
    },
    [
      documentContent,
      dirty,
      error,
      fileKey,
      loading,
      openPlansDirectory,
      originalContent,
      pendingAction,
      planUnits,
      resolvePendingAction,
      runWorkflowAction,
      saveCurrentDocument,
      selectArtifact,
      selectPlan,
      selectedArtifact,
      selectedPlan,
      setDocumentContent,
      viewMode,
    ],
  );

  return {
    planUnits,
    selectedPlan,
    selectedArtifact,
    documentContent,
    dirty,
    pendingAction,
    loading,
    error,
    openPlansDirectory,
    selectPlan,
    selectArtifact,
    setDocumentContent,
    requestWorkflowAction,
    runWorkflowAction,
    resolvePendingAction,
    saveCurrentDocument,
    renderContent,
  };
}

```

## web\src\pages\superuser\PlanUnitsRail.tsx

```tsx
import type { PlanUnit } from './planTrackerModel';

type Props = {
  units: PlanUnit[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
};

const STATUS_ORDER = ['to-do', 'in-progress', 'under-review', 'approved', 'implemented', 'verified', 'closed'];

function labelForStatus(status: string) {
  return status.replaceAll('-', ' ').toUpperCase();
}

export function PlanUnitsRail({ units, selectedPlanId, onSelectPlan }: Props) {
  const groups = STATUS_ORDER.map((status) => ({
    status,
    items: units.filter((unit) => unit.status === status),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/40" data-testid="plan-units-rail">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Primary Rail</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.status} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {labelForStatus(group.status)}
              </h3>
              <div className="space-y-1">
                {group.items.map((unit) => {
                  const selected = unit.planId === selectedPlanId;
                  return (
                    <button
                      key={unit.planId}
                      type="button"
                      onClick={() => onSelectPlan(unit.planId)}
                      className={[
                        'flex w-full items-start rounded-md border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-primary/40 bg-primary/10 text-foreground'
                          : 'border-transparent bg-background/80 text-foreground hover:border-border hover:bg-background',
                      ].join(' ')}
                    >
                      <span className="text-sm font-medium leading-5">{unit.title}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

```

## web\src\pages\superuser\PlanArtifactsRail.tsx

```tsx
import type { PlanArtifactSummary, PlanUnit } from './planTrackerModel';

type Props = {
  plan: PlanUnit;
  selectedArtifactId: string;
  onSelectArtifact: (artifactId: string) => void;
};

function labelForArtifact(artifact: PlanArtifactSummary) {
  return artifact.title;
}

export function PlanArtifactsRail({ plan, selectedArtifactId, onSelectArtifact }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/30" data-testid="plan-artifacts-rail">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Secondary Artifact Rail</h2>
        <p className="mt-2 text-sm text-muted-foreground">Artifacts for {plan.title}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {plan.artifacts.map((artifact) => {
            const selected = artifact.artifactId === selectedArtifactId;
            return (
              <button
                key={artifact.artifactId}
                type="button"
                aria-label={artifact.title}
                onClick={() => onSelectArtifact(artifact.artifactId)}
                className={[
                  'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors',
                  selected
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'border-transparent bg-background/80 text-foreground hover:border-border hover:bg-background',
                ].join(' ')}
              >
                <span className="truncate text-sm font-medium">{labelForArtifact(artifact)}</span>
                <span
                  aria-hidden="true"
                  className="ml-3 shrink-0 rounded bg-muted px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground"
                >
                  {artifact.artifactType}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

```

## web\src\pages\superuser\PlanMetadataPane.tsx

```tsx
import type { PlanArtifactSummary, PlanUnit, WorkflowActionId } from './planTrackerModel';

type Props = {
  plan: PlanUnit;
  artifact: PlanArtifactSummary;
  dirty?: boolean;
  pendingAction?: { actionId: WorkflowActionId } | null;
  onAction?: (actionId: WorkflowActionId) => void;
  onResolvePendingAction?: (choice: 'save' | 'discard' | 'cancel') => void;
};

function MetadataRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value && value.length > 0 ? value : 'â€”'}</dd>
    </div>
  );
}

const ACTIONS: Array<{ id: WorkflowActionId; label: string }> = [
  { id: 'reject-with-notes', label: 'Reject with Notes' },
  { id: 'approve-with-notes', label: 'Approve with Notes' },
  { id: 'create-revision', label: 'Create Revision' },
  { id: 'attach-implementation-note', label: 'Attach Implementation Note' },
  { id: 'attach-verification', label: 'Attach Verification' },
];

export function PlanMetadataPane({
  plan,
  artifact,
  dirty = false,
  pendingAction = null,
  onAction,
  onResolvePendingAction,
}: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20" data-testid="plan-metadata-pane">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Metadata/Action Pane</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Metadata</h3>
          <dl className="space-y-3">
            <MetadataRow label="Title" value={artifact.title} />
            <MetadataRow label="Status" value={artifact.status} />
            <MetadataRow label="Artifact Type" value={artifact.artifactType} />
            <MetadataRow label="Plan ID" value={plan.planId} />
            <MetadataRow label="Product Area" value={artifact.metadata.productArea ?? plan.productArea} />
            <MetadataRow label="Functional Area" value={artifact.metadata.functionalArea ?? plan.functionalArea} />
            <MetadataRow label="Updated At" value={artifact.metadata.updatedAt} />
            <MetadataRow label="Tracker ID" value={artifact.metadata.trackerId} />
            <MetadataRow label="Tags" value={artifact.metadata.tags?.join(', ')} />
          </dl>
        </section>

        <section className="mt-8 space-y-4">
          <h3 className="text-lg font-semibold">Actions</h3>
          <div className="space-y-2">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={!onAction}
                onClick={() => onAction?.(action.id)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium text-foreground disabled:text-muted-foreground disabled:opacity-70"
              >
                {action.label}
              </button>
            ))}
          </div>
          {pendingAction ? (
            <div className="space-y-3 rounded-md border border-border bg-background px-3 py-3">
              <p className="text-sm font-medium">Resolve pending action</p>
              <p className="text-xs text-muted-foreground">
                {dirty
                  ? `The current document has unsaved edits. Resolve them before ${pendingAction.actionId}.`
                  : `Continue ${pendingAction.actionId}.`}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium"
                  onClick={() => onResolvePendingAction?.('save')}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium"
                  onClick={() => onResolvePendingAction?.('discard')}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm font-medium"
                  onClick={() => onResolvePendingAction?.('cancel')}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {dirty ? 'Unsaved edits will trigger the action gate before workflow side effects occur.' : 'Actions create or update concrete tracker artifacts.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

```

## web\src\pages\superuser\PlanDocumentPreview.tsx

```tsx
import ReactMarkdown from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

type Props = {
  title: string;
  markdown: string;
};

function stripLeadingFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function PlanDocumentPreview({ title, markdown }: Props) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background" data-testid="plan-document-preview">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight">Document Surface</h2>
        <p className="mt-2 text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <article className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkFrontmatter, remarkGfm]}>
            {stripLeadingFrontmatter(markdown)}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

```

## web\src\pages\superuser\MdxEditorSurface.tsx

```tsx
/**
 * MDXEditor surface for .md/.mdx files in the superuser workspace.
 *
 * Full plugin integration â€” all MDXEditor features enabled:
 * - Rich text editing (headings, lists, quotes, bold/italic/underline, inline code)
 * - Diff/source mode (rich-text, source, diff views)
 * - Images (with upload handler)
 * - Tables
 * - Code blocks (CodeMirror with language support)
 * - Links & link dialogs
 * - Front-matter editing
 * - Directives & admonitions
 * - Markdown shortcuts
 * - Search & replace
 * - Toolbar with all built-in components
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsDark } from '@/lib/useIsDark';
import { appCodeMirrorTheme } from '@/lib/codemirrorTheme';
import { ScrollArea } from '@/components/ui/scroll-area';
import '@/styles/mdxeditor-overrides.css';

export type MdxViewMode = 'rich-text' | 'source' | 'diff';

type MDXEditorModule = typeof import('@mdxeditor/editor');
type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

type Props = {
  /** Current markdown content. When this changes (new file), the editor resets. */
  content: string;
  /** Previous version for diff view (optional) */
  diffMarkdown?: string;
  /** Unique key to force remount when file changes */
  fileKey: string;
  /** Externally controlled view mode */
  viewMode: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  /** Optional image upload handler */
  onImageUpload?: (image: File) => Promise<string>;
};

export function MdxEditorSurface({ content, diffMarkdown, fileKey, viewMode, onChange, onSave, onImageUpload }: Props) {
  const [mod, setMod] = useState<MDXEditorModule | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const isDark = useIsDark();

  const loadEditor = useCallback(() => {
    setLoadState('loading');
    Promise.all([
      import('@mdxeditor/editor'),
      import('@mdxeditor/editor/style.css'),
    ])
      .then(([editorMod]) => {
        setMod(editorMod as unknown as MDXEditorModule);
        setLoadState('ready');
      })
      .catch((err) => {
        console.error('[MdxEditorSurface] Failed to load:', err);
        setLoadState('failed');
      });
  }, []);

  useEffect(() => {
    loadEditor();
  }, [loadEditor]);

  if (loadState === 'failed') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <span>MDX editor failed to load.</span>
        <button type="button" className="text-primary underline text-xs" onClick={loadEditor}>
          Retry
        </button>
      </div>
    );
  }

  if (!mod || loadState !== 'ready') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <MdxEditorInner
      key={fileKey}
      mod={mod}
      content={content}
      diffMarkdown={diffMarkdown}
      isDark={isDark}
      viewMode={viewMode}
      onChange={onChange}
      onSave={onSave}
      onImageUpload={onImageUpload}
    />
  );
}

// â”€â”€â”€ Inner component (only rendered when module is loaded) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MdxEditorInner({
  mod,
  content,
  diffMarkdown,
  isDark,
  viewMode,
  onChange,
  onSave,
  onImageUpload,
}: {
  mod: MDXEditorModule;
  content: string;
  diffMarkdown?: string;
  isDark: boolean;
  viewMode: MdxViewMode;
  onChange: (value: string) => void;
  onSave?: () => void;
  onImageUpload?: (image: File) => Promise<string>;
}) {
  const {
    MDXEditor,
    // â”€â”€ Core formatting plugins â”€â”€
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    // â”€â”€ Links â”€â”€
    linkPlugin,
    linkDialogPlugin,
    // â”€â”€ Images â”€â”€
    imagePlugin,
    // â”€â”€ Tables â”€â”€
    tablePlugin,
    // â”€â”€ Code blocks â”€â”€
    codeBlockPlugin,
    codeMirrorPlugin,
    // â”€â”€ Front-matter â”€â”€
    frontmatterPlugin,
    // â”€â”€ JSX â”€â”€
    jsxPlugin,
    // â”€â”€ Directives & admonitions â”€â”€
    directivesPlugin,
    AdmonitionDirectiveDescriptor,
    // â”€â”€ Diff/source mode â”€â”€
    diffSourcePlugin,
    // â”€â”€ Toolbar â”€â”€
    toolbarPlugin,
    // â”€â”€ Toolbar components â”€â”€
    UndoRedo,
    BoldItalicUnderlineToggles,
    CodeToggle,
    HighlightToggle,
    BlockTypeSelect,
    CreateLink,
    InsertImage,
    InsertTable,
    InsertThematicBreak,
    InsertFrontmatter,
    InsertCodeBlock,
    InsertAdmonition,
    ListsToggle,
    Separator,
    ConditionalContents,
    ChangeCodeMirrorLanguage,
    // â”€â”€ Realm API for viewMode sync â”€â”€
    realmPlugin,
    viewMode$,
  } = mod as any;

  // searchPlugin may not exist in all versions
  const searchPlugin = (mod as any).searchPlugin;

  const editorRef = useRef<any>(null);

  function handleSaveKeyDown(event: React.KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      onSave?.();
    }
  }

  // â”€â”€ Custom plugin to sync external viewMode into MDXEditor realm â”€â”€â”€â”€â”€â”€â”€â”€

  const viewModeSyncPlugin = realmPlugin({
    update(realm: any) {
      realm.pub(viewMode$, viewMode);
    },
  });

  // â”€â”€ Build plugin array â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const plugins = [
    // Core formatting
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),

    // Links
    linkPlugin(),
    linkDialogPlugin(),

    // Images
    imagePlugin({
      ...(onImageUpload ? { imageUploadHandler: onImageUpload } : {}),
    }),

    // Tables
    tablePlugin(),

    // Code blocks with full language support
    codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        '': 'Plain',
        js: 'JavaScript',
        jsx: 'JSX',
        ts: 'TypeScript',
        tsx: 'TSX',
        css: 'CSS',
        html: 'HTML',
        python: 'Python',
        rust: 'Rust',
        go: 'Go',
        sql: 'SQL',
        bash: 'Bash',
        shell: 'Shell',
        json: 'JSON',
        yaml: 'YAML',
        toml: 'TOML',
        xml: 'XML',
        markdown: 'Markdown',
        c: 'C',
        cpp: 'C++',
        csharp: 'C#',
        java: 'Java',
        kotlin: 'Kotlin',
        swift: 'Swift',
        ruby: 'Ruby',
        php: 'PHP',
        lua: 'Lua',
        r: 'R',
        scala: 'Scala',
        haskell: 'Haskell',
        elixir: 'Elixir',
        erlang: 'Erlang',
        clojure: 'Clojure',
        dart: 'Dart',
        zig: 'Zig',
        nim: 'Nim',
        dockerfile: 'Dockerfile',
        graphql: 'GraphQL',
        protobuf: 'Protocol Buffers',
        terraform: 'Terraform',
        vue: 'Vue',
        svelte: 'Svelte',
      },
      codeMirrorExtensions: [appCodeMirrorTheme],
    }),

    // Front-matter
    frontmatterPlugin(),

    // JSX components in MDX
    jsxPlugin(),

    // Directives & admonitions
    directivesPlugin({
      directiveDescriptors: [AdmonitionDirectiveDescriptor],
    }),

    // Diff/source mode â€” all 3 views
    diffSourcePlugin({
      viewMode,
      ...(diffMarkdown != null ? { diffMarkdown } : {}),
    }),

    // ViewMode sync â€” keeps realm in sync when viewMode prop changes
    viewModeSyncPlugin(),

    // Toolbar â€” full feature set (mode toggle hidden via CSS, controlled externally)
    toolbarPlugin({
      toolbarContents: () => (
        <ConditionalContents
          options={[
            {
              when: (editor: any) => editor?.editorType === 'codeblock',
              contents: () => <ChangeCodeMirrorLanguage />,
            },
            {
              fallback: () => (
                <>
                  <UndoRedo />
                  <Separator />
                  <BoldItalicUnderlineToggles />
                  <CodeToggle />
                  <HighlightToggle />
                  <Separator />
                  <BlockTypeSelect />
                  <Separator />
                  <ListsToggle />
                  <Separator />
                  <CreateLink />
                  <InsertImage />
                  <InsertTable />
                  <InsertThematicBreak />
                  <Separator />
                  <InsertCodeBlock />
                  <InsertAdmonition />
                  <InsertFrontmatter />
                </>
              ),
            },
          ]}
        />
      ),
    }),
  ];

  // Add search plugin if available
  if (searchPlugin) {
    plugins.splice(-1, 0, searchPlugin());
  }

  return (
    <div
      className={`h-full w-full overflow-hidden ${isDark ? 'dark-theme' : 'light-theme'}`}
      onKeyDownCapture={handleSaveKeyDown}
      tabIndex={0}
      role="presentation"
    >
      <ScrollArea className="h-full" viewportClass="!overflow-x-hidden" contentClass="!min-w-0">
        <MDXEditor
          ref={editorRef}
          markdown={content}
          onChange={onChange}
          className="h-full"
          contentEditableClassName="prose prose-sm max-w-none dark:prose-invert py-4 px-8"
          plugins={plugins}
        />
      </ScrollArea>
    </div>
  );
}

```

## web\src\pages\superuser\WorkspaceFileTree.tsx

```tsx
/**
 * Workspace file tree â€” Ark UI TreeView backed by the File System Access API.
 * Ported from web-docs/src/components/DocsSidebarFileTree.tsx, generalized
 * for all file types and stripped of docs-specific concerns.
 */
import { type TreeViewNodeProviderProps, TreeViewRoot, TreeViewTree, TreeViewNodeProvider, TreeViewBranch, TreeViewBranchControl, TreeViewBranchTrigger, TreeViewBranchIndicator, TreeViewBranchText, TreeViewBranchContent, TreeViewBranchIndentGuide, TreeViewItem, TreeViewItemText, createTreeCollection } from '@/components/ui/tree-view';
import {
  ChevronRight,
  File,
  FileCode2,
  FilePlus,
  FileText,
  FolderClosed,
  FolderOpen,
  FolderOpenDot,
  FolderPlus,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type FsNode,
  clearSavedDirectoryHandle,
  pickDirectory,
  readDirectory,
  restoreDirectoryHandle,
  saveDirectoryHandle,
} from '@/lib/fs-access';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MenuRoot,
  MenuTrigger,
  MenuPortal,
  MenuPositioner,
  MenuContent,
  MenuItem,
} from '@/components/ui/menu';

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ICON_SIZE = 16;
const ICON_STROKE = 2;

const MD_EXTENSIONS = new Set(['.md', '.mdx']);
const CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.css', '.html',
  '.py', '.rs', '.go', '.json', '.yaml', '.yml',
  '.toml', '.sql', '.sh', '.bash', '.vue', '.svelte',
]);

function fileIcon(ext: string) {
  if (MD_EXTENSIONS.has(ext)) return <FileText size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground" />;
  if (CODE_EXTENSIONS.has(ext)) return <FileCode2 size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground" />;
  return <File size={ICON_SIZE} strokeWidth={ICON_STROKE} className="shrink-0 text-muted-foreground" />;
}

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Props = {
  onSelectFile: (node: FsNode) => void;
  onMoveNode?: (source: FsNode, targetDir: FsNode) => void;
  onRenameNode?: (node: FsNode, newName: string) => void;
  onDeleteNode?: (node: FsNode) => void;
  onCreateFile?: (parentHandle: FileSystemDirectoryHandle, name: string) => void;
  onCreateFolder?: (parentHandle: FileSystemDirectoryHandle, name: string) => void;
  onRootHandle?: (handle: FileSystemDirectoryHandle) => void;
  refreshKey?: number;
  /** IndexedDB key for persisting this tree's directory handle (allows independent persistence per layout). */
  storeKey?: string;
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function WorkspaceFileTree({ onSelectFile, onMoveNode, onRenameNode, onDeleteNode, onCreateFile, onCreateFolder, onRootHandle, refreshKey, storeKey }: Props) {
  const [nodes, setNodes] = useState<FsNode[]>([]);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const dragNodeRef = useRef<FsNode | null>(null);
  const rootHandleRef = useRef<FileSystemDirectoryHandle | null>(null);

  const hasFolder = nodes.length > 0;

  // â”€â”€ Session restore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    restoreDirectoryHandle(storeKey).then(async (handle) => {
      if (!handle) return;
      try {
        const perm = await (handle as any).queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const children = await readDirectory(handle);
          setFolderName(handle.name);
          setNodes(children);
          rootHandleRef.current = handle;
          onRootHandle?.(handle);
        } else {
          setFolderName(handle.name);
          setNeedsReauth(true);
        }
      } catch {
        setFolderName(handle.name);
        setNeedsReauth(true);
      }
    });
  }, []);

  // â”€â”€ Folder actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openFolder = useCallback(async () => {
    setError('');
    try {
      const handle = await pickDirectory();
      const children = await readDirectory(handle);
      setFolderName(handle.name);
      setNodes(children);
      rootHandleRef.current = handle;
      onRootHandle?.(handle);
      setNeedsReauth(false);
      saveDirectoryHandle(handle, storeKey);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to open folder');
    }
  }, [onRootHandle, storeKey]);

  const reconnectFolder = useCallback(async () => {
    setError('');
    try {
      const handle = await restoreDirectoryHandle(storeKey);
      if (!handle) {
        setNeedsReauth(false);
        clearSavedDirectoryHandle(storeKey);
        return;
      }
      const perm = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return;
      const children = await readDirectory(handle);
      setFolderName(handle.name);
      setNodes(children);
      rootHandleRef.current = handle;
      onRootHandle?.(handle);
      setNeedsReauth(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reconnect folder');
    }
  }, [onRootHandle, storeKey]);

  const closeFolder = useCallback(() => {
    setNodes([]);
    setFolderName(null);
    setNeedsReauth(false);
    clearSavedDirectoryHandle(storeKey);
  }, [storeKey]);

  // â”€â”€ Refresh effect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (refreshKey === undefined || refreshKey === 0) return;
    const handle = rootHandleRef.current;
    if (!handle) return;
    readDirectory(handle).then((children) => {
      setNodes(children);
    });
  }, [refreshKey]);

  // â”€â”€ Drag handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleDragStart = useCallback((e: React.DragEvent, node: FsNode) => {
    dragNodeRef.current = node;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetNode: FsNode) => {
    if (targetNode.kind !== 'directory') return;
    if (dragNodeRef.current?.id === targetNode.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    (e.currentTarget as HTMLElement).dataset.dragOver = 'true';
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    delete (e.currentTarget as HTMLElement).dataset.dragOver;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetNode: FsNode) => {
    e.preventDefault();
    delete (e.currentTarget as HTMLElement).dataset.dragOver;
    const source = dragNodeRef.current;
    dragNodeRef.current = null;
    if (!source || targetNode.kind !== 'directory') return;
    if (source.id === targetNode.id) return;
    onMoveNode?.(source, targetNode);
  }, [onMoveNode]);

  const handleDragEnd = useCallback(() => {
    dragNodeRef.current = null;
  }, []);

  // â”€â”€ Context menu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FsNode } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FsNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu]);

  // â”€â”€ Tree collection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const rootNode = useMemo<FsNode>(
    () => ({
      id: 'dir:root',
      name: folderName || 'workspace',
      path: '',
      extension: '',
      kind: 'directory',
      handle: null!,
      children: nodes,
    }),
    [nodes, folderName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<FsNode>({
        nodeToValue: (node) => node.id,
        nodeToString: (node) => node.name,
        rootNode,
      }),
    [rootNode],
  );

  // â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center text-sm text-muted-foreground">
        <span>{error}</span>
        <button type="button" className="text-primary underline text-xs" onClick={openFolder}>
          Try Again
        </button>
      </div>
    );
  }

  // â”€â”€ Reauth state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (needsReauth && !hasFolder) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
        <FolderOpen size={20} strokeWidth={1.5} />
        <span>Folder access expired</span>
        <span className="text-xs opacity-70">{folderName}</span>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary underline"
          onClick={reconnectFolder}
        >
          <RefreshCw size={12} strokeWidth={ICON_STROKE} />
          Reconnect
        </button>
        <button
          type="button"
          className="text-xs text-muted-foreground/60 underline"
          onClick={closeFolder}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!hasFolder) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-sm text-muted-foreground">
        <FolderOpenDot size={24} strokeWidth={1.5} />
        <span>No folder open</span>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={openFolder}
        >
          Open Folder
        </button>
      </div>
    );
  }

  // â”€â”€ Tree â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <FolderOpen size={14} strokeWidth={ICON_STROKE} />
          <span className="truncate">{folderName}</span>
        </div>
        <div className="flex items-center gap-1">
          <MenuRoot positioning={{ placement: 'bottom-end', offset: { mainAxis: 4 } }}>
            <MenuTrigger asChild>
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                title="New..."
              >
                <Plus size={13} strokeWidth={ICON_STROKE} />
              </button>
            </MenuTrigger>
            <MenuPortal>
              <MenuPositioner>
                <MenuContent>
                  <MenuItem
                    value="new-file"
                    leftSection={<FilePlus size={14} strokeWidth={ICON_STROKE} />}
                    onClick={() => {
                      const root = rootHandleRef.current;
                      if (!root) return;
                      const name = window.prompt('New file name:');
                      if (name?.trim()) onCreateFile?.(root, name.trim());
                    }}
                  >
                    New File
                  </MenuItem>
                  <MenuItem
                    value="new-folder"
                    leftSection={<FolderPlus size={14} strokeWidth={ICON_STROKE} />}
                    onClick={() => {
                      const root = rootHandleRef.current;
                      if (!root) return;
                      const name = window.prompt('New folder name:');
                      if (name?.trim()) onCreateFolder?.(root, name.trim());
                    }}
                  >
                    New Folder
                  </MenuItem>
                </MenuContent>
              </MenuPositioner>
            </MenuPortal>
          </MenuRoot>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            onClick={openFolder}
            title="Switch folder"
          >
            <RefreshCw size={13} strokeWidth={ICON_STROKE} />
          </button>
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
            onClick={closeFolder}
            title="Close folder"
          >
            <X size={13} strokeWidth={ICON_STROKE} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1 min-h-0" viewportClass="!overflow-x-hidden" contentClass="p-4">
        <TreeViewRoot
          aria-label="Workspace file tree"
          collection={collection}
          selectionMode="single"
          expandOnClick
          canRename={(node) => node.id !== 'dir:root'}
          onRenameComplete={(details) => {
            const node = findNodeById(nodes, details.value);
            if (node && details.label && details.label !== node.name) {
              onRenameNode?.(node, details.label);
            }
          }}
        >
          <TreeViewTree className="py-1 pb-2">
            {collection.rootNode.children?.map((node, index) => (
              <TreeNodeView
                key={node.id}
                node={node}
                indexPath={[index]}
                onSelect={onSelectFile}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                onContextMenu={handleContextMenu}
              />
            ))}
          </TreeViewTree>
        </TreeViewRoot>
      </ScrollArea>

      {contextMenu && (
        <div
          className="ui-menu-content fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="ui-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const dir = contextMenu.node.kind === 'directory'
                ? contextMenu.node.handle as FileSystemDirectoryHandle
                : contextMenu.node.parentHandle;
              if (!dir) return;
              const name = window.prompt('New file name:');
              if (name?.trim()) onCreateFile?.(dir, name.trim());
              setContextMenu(null);
            }}
          >
            <FilePlus size={14} strokeWidth={ICON_STROKE} className="shrink-0" />
            New File
          </button>
          <button
            type="button"
            className="ui-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              const dir = contextMenu.node.kind === 'directory'
                ? contextMenu.node.handle as FileSystemDirectoryHandle
                : contextMenu.node.parentHandle;
              if (!dir) return;
              const name = window.prompt('New folder name:');
              if (name?.trim()) onCreateFolder?.(dir, name.trim());
              setContextMenu(null);
            }}
          >
            <FolderPlus size={14} strokeWidth={ICON_STROKE} className="shrink-0" />
            New Folder
          </button>
          <div className="ui-menu-separator -mx-1 my-1 h-px bg-border" />
          <button
            type="button"
            className="ui-menu-item relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => { onDeleteNode?.(contextMenu.node); setContextMenu(null); }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function findNodeById(nodes: FsNode[], id: string): FsNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// â”€â”€â”€ TreeNodeView â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type TreeNodeViewProps = TreeViewNodeProviderProps<FsNode> & {
  onSelect: (node: FsNode) => void;
  onDragStart: (e: React.DragEvent, node: FsNode) => void;
  onDragOver: (e: React.DragEvent, node: FsNode) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, node: FsNode) => void;
  onDragEnd: () => void;
  onContextMenu: (e: React.MouseEvent, node: FsNode) => void;
};

function TreeNodeView({
  node,
  indexPath,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onContextMenu,
}: TreeNodeViewProps) {
  if (node.kind === 'directory') {
    return (
      <TreeViewNodeProvider node={node} indexPath={indexPath}>
        <TreeViewBranch>
          <TreeViewBranchControl className="min-w-0">
            <TreeViewBranchTrigger
              className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded px-2 py-1 text-sm hover:bg-accent data-[drag-over=true]:bg-accent/50 data-[drag-over=true]:ring-1 data-[drag-over=true]:ring-primary/50"
              draggable
              onDragStart={(e) => onDragStart(e, node)}
              onDragOver={(e) => onDragOver(e, node)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, node)}
              onDragEnd={onDragEnd}
              onContextMenu={(e) => onContextMenu(e, node)}
            >
              <TreeViewBranchIndicator className="transition-transform data-[state=open]:rotate-90">
                <ChevronRight size={14} strokeWidth={ICON_STROKE} className="shrink-0" />
              </TreeViewBranchIndicator>
              <TreeViewBranchText className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                <FolderClosed
                  size={ICON_SIZE}
                  strokeWidth={ICON_STROKE}
                  className="shrink-0 text-muted-foreground [[data-state=open]_&]:hidden"
                />
                <FolderOpen
                  size={ICON_SIZE}
                  strokeWidth={ICON_STROKE}
                  className="shrink-0 text-muted-foreground hidden [[data-state=open]_&]:block"
                />
                <span className="min-w-0 truncate">{node.name}</span>
              </TreeViewBranchText>
            </TreeViewBranchTrigger>
          </TreeViewBranchControl>
          <TreeViewBranchContent className="pl-4">
            <TreeViewBranchIndentGuide />
            {(node.children ?? []).map((child, i) => (
              <TreeNodeView
                key={child.id}
                node={child}
                indexPath={[...indexPath, i]}
                onSelect={onSelect}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onContextMenu={onContextMenu}
              />
            ))}
          </TreeViewBranchContent>
        </TreeViewBranch>
      </TreeViewNodeProvider>
    );
  }

  return (
    <TreeViewNodeProvider node={node} indexPath={indexPath}>
      <TreeViewItem>
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded px-2 py-1 text-sm hover:bg-accent"
          onClick={() => onSelect(node)}
          draggable
          onDragStart={(e) => onDragStart(e, node)}
          onDragEnd={onDragEnd}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <TreeViewItemText className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {fileIcon(node.extension)}
            <span className="min-w-0 truncate">{node.name}</span>
          </TreeViewItemText>
        </button>
      </TreeViewItem>
    </TreeViewNodeProvider>
  );
}

```

## web\src\lib\fs-access.ts

```ts
/**
 * File System Access API utilities for the superuser workspace.
 *
 * Adapted from web-docs/src/lib/docs/local-file-handles.ts â€” generalized
 * to support all file types and simplified to remove docs-specific concerns.
 */

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type FsNode = {
  id: string;
  name: string;
  path: string;
  extension: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  parentHandle?: FileSystemDirectoryHandle;
  children?: FsNode[];
};

// â”€â”€â”€ Directory reading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const IGNORED = new Set([
  '.git', 'node_modules', '.DS_Store', '__pycache__',
  '.next', 'dist', 'build', '.turbo', '.cache',
]);

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export async function readDirectory(
  dirHandle: FileSystemDirectoryHandle,
  parentPath = '',
): Promise<FsNode[]> {
  const entries: FsNode[] = [];

  for await (const [name, handle] of (dirHandle as any).entries()) {
    if (name.startsWith('.') && name !== '.env.example') continue;
    if (IGNORED.has(name)) continue;

    const childPath = parentPath ? `${parentPath}/${name}` : name;

    if (handle.kind === 'directory') {
      const children = await readDirectory(handle as FileSystemDirectoryHandle, childPath);
      entries.push({
        id: `dir:${childPath}`,
        name,
        path: childPath,
        extension: '',
        kind: 'directory',
        handle,
        parentHandle: dirHandle,
        children,
      });
    } else {
      entries.push({
        id: `file:${childPath}`,
        name,
        path: childPath,
        extension: getExtension(name),
        kind: 'file',
        handle,
        parentHandle: dirHandle,
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.kind === 'directory' && b.kind !== 'directory') return -1;
    if (a.kind !== 'directory' && b.kind === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

// â”€â”€â”€ File read / write â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeFileContent(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await (handle as any).createWritable();
  await writable.write(content);
  await writable.close();
}

// â”€â”€â”€ File operations (move / delete / rename) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function moveFile(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  const name = newName ?? node.name;
  // Check for existing file (overwrite guard)
  let existingFile: FileSystemFileHandle | null = null;
  try {
    existingFile = await targetDirHandle.getFileHandle(name);
  } catch {
    // NotFoundError â€” safe to proceed
  }
  if (existingFile) {
    const ok = window.confirm(`"${name}" already exists in the target folder. Overwrite?`);
    if (!ok) return;
  }
  // 1. Read source content (arrayBuffer to support binary files)
  const file = await (node.handle as FileSystemFileHandle).getFile();
  const content = await file.arrayBuffer();
  // 2. Create file in target directory
  const newHandle = await targetDirHandle.getFileHandle(name, { create: true });
  const writable = await (newHandle as any).createWritable();
  await writable.write(content);
  await writable.close();
  // 3. Remove source from parent
  if (node.parentHandle) {
    await node.parentHandle.removeEntry(node.name);
  }
}

async function moveDirectory(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  const name = newName ?? node.name;
  // Check for existing directory (merge guard)
  let existingDir: FileSystemDirectoryHandle | null = null;
  try {
    existingDir = await targetDirHandle.getDirectoryHandle(name);
  } catch {
    // NotFoundError â€” safe to proceed
  }
  if (existingDir) {
    const ok = window.confirm(`Folder "${name}" already exists in the target. Merge into it?`);
    if (!ok) return;
  }
  // 1. Create directory in target
  const newDirHandle = await targetDirHandle.getDirectoryHandle(name, { create: true });
  // 2. Recursively copy all children
  const srcHandle = node.handle as FileSystemDirectoryHandle;
  for await (const [childName, childHandle] of (srcHandle as any).entries()) {
    if (childHandle.kind === 'file') {
      const file = await (childHandle as FileSystemFileHandle).getFile();
      const content = await file.arrayBuffer();
      const newFile = await newDirHandle.getFileHandle(childName, { create: true });
      const writable = await (newFile as any).createWritable();
      await writable.write(content);
      await writable.close();
    } else {
      await moveDirectory(
        { handle: childHandle, name: childName, kind: 'directory', parentHandle: srcHandle } as FsNode,
        newDirHandle,
      );
    }
  }
  // 3. Remove source directory from parent
  if (node.parentHandle) {
    await node.parentHandle.removeEntry(node.name, { recursive: true });
  }
}

export async function moveNode(
  node: FsNode,
  targetDirHandle: FileSystemDirectoryHandle,
  newName?: string,
): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot move a node without a parent handle');
  }
  // Guard: cannot move into itself
  // NOTE: moving a parent into a descendant (e.g., /a into /a/b) is guarded
  // by path-prefix check in the UI layer, not here,
  // because isSameEntry only catches exact matches.
  if (await node.handle.isSameEntry(targetDirHandle)) {
    throw new Error('Cannot move a node into itself');
  }
  if (node.kind === 'file') {
    await moveFile(node, targetDirHandle, newName);
  } else {
    await moveDirectory(node, targetDirHandle, newName);
  }
}

export async function deleteNode(node: FsNode): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot delete a node without a parent handle');
  }
  const options = node.kind === 'directory' ? { recursive: true } : undefined;
  await node.parentHandle.removeEntry(node.name, options);
}

export async function renameNode(node: FsNode, newName: string): Promise<void> {
  if (!node.parentHandle) {
    throw new Error('Cannot rename a node without a parent handle');
  }
  await moveNode(node, node.parentHandle, newName);
}

// â”€â”€â”€ File / directory creation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createFile(
  parentHandle: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemFileHandle> {
  // Guard: check for existing file or directory with this name.
  // getFileHandle throws NotFoundError (no entry) or TypeMismatchError (a directory exists).
  try {
    await parentHandle.getFileHandle(name);
    throw new Error(`"${name}" already exists in this folder.`);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      // No entry â€” safe to create.
    } else if (err instanceof DOMException && err.name === 'TypeMismatchError') {
      throw new Error(`A folder named "${name}" already exists here.`);
    } else {
      throw err;
    }
  }
  const handle = await parentHandle.getFileHandle(name, { create: true });
  // Write empty content so the file is immediately readable
  const writable = await (handle as any).createWritable();
  await writable.write('');
  await writable.close();
  return handle;
}

export async function createDirectory(
  parentHandle: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle> {
  // Guard: check for existing directory or file with this name.
  // getDirectoryHandle throws NotFoundError (no entry) or TypeMismatchError (a file exists).
  try {
    await parentHandle.getDirectoryHandle(name);
    throw new Error(`Folder "${name}" already exists in this directory.`);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      // No entry â€” safe to create.
    } else if (err instanceof DOMException && err.name === 'TypeMismatchError') {
      throw new Error(`A file named "${name}" already exists here.`);
    } else {
      throw err;
    }
  }
  return parentHandle.getDirectoryHandle(name, { create: true });
}

// â”€â”€â”€ Directory picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!('showDirectoryPicker' in window)) {
    throw new Error('File System Access API is not supported in this browser.');
  }
  return (window as any).showDirectoryPicker({ mode: 'readwrite' });
}

// â”€â”€â”€ IndexedDB handle persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const IDB_NAME = 'superuser-workspace';
const IDB_STORE = 'handles';
const DEFAULT_DIR_HANDLE_KEY = 'selectedDir';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle, storeKey = DEFAULT_DIR_HANDLE_KEY): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, storeKey);
    await awaitTransaction(tx);
    db.close();
  } catch {
    // Ignore â€” persistence is best-effort.
  }
}

export async function restoreDirectoryHandle(storeKey = DEFAULT_DIR_HANDLE_KEY): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(storeKey);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearSavedDirectoryHandle(storeKey = DEFAULT_DIR_HANDLE_KEY): Promise<void> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(storeKey);
    await awaitTransaction(tx);
    db.close();
  } catch {
    // Ignore.
  }
}
```

## web\src\components\workbench\Workbench.tsx

```tsx
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
import { useIsMobile } from '@/hooks/use-mobile';

import {
  activateTabInPane,
  closeTabInPane,
  normalizePaneWidths,
  removeTabFromAll,
  setActiveTabInPane,
  type Pane,
} from './workbenchState';
import './Workbench.css';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  className?: string;
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
  /** Minimum number of columns (panes). Removal is blocked at the limit. */
  minColumns?: number;
  /** Maximum number of tabs per pane. Adding tabs beyond this is blocked. */
  maxTabsPerPane?: number;
  /** Disable all drag-and-drop (pane reorder + tab move between panes). */
  disableDrag?: boolean;
  /** Lock pane chrome so tabs and panes cannot be closed, split, or rearranged from the UI. */
  lockLayout?: boolean;
  /** On mobile, which tabs to show in the switcher. If omitted, all tabs are shown.
   *  Use this to limit mobile to a subset (e.g. only ['upload','files','preview']). */
  mobileTabs?: string[];
};

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MIN_PANE_PERCENT = 18;
const DRAG_PAYLOAD_MIME = 'application/x-workbench-drag';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  maxWidth?: number;
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
        ...(Number.isFinite(item.maxWidth) && item.maxWidth! > 0 ? { maxWidth: item.maxWidth } : {}),
        ...(Number.isFinite(item.maxTabs) && item.maxTabs! > 0 ? { maxTabs: item.maxTabs } : {}),
      };
    });

    return normalizePaneWidths(normalized);
  } catch {
    return null;
  }
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const Workbench = forwardRef<WorkbenchHandle, WorkbenchProps>(function Workbench({ tabs, defaultPanes, saveKey, renderContent, className, toolbarActions, hideToolbar = false, dynamicTabLabel, onPanesChange, transformPanes, maxColumns, minColumns, maxTabsPerPane, disableDrag = false, lockLayout = false, mobileTabs }, ref) {
  const isMobile = useIsMobile();
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

  // â”€â”€ onPanesChange notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    onPanesChange?.(panes);
  }, [panes, onPanesChange]);

  // â”€â”€ Imperative handle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ localStorage hydration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ localStorage persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = panes.map((pane): PersistedPane => ({
      id: pane.id,
      tabs: pane.tabs,
      activeTab: pane.activeTab,
      width: pane.width,
      ...(pane.minWidth != null ? { minWidth: pane.minWidth } : {}),
      ...(pane.maxWidth != null ? { maxWidth: pane.maxWidth } : {}),
      ...(pane.maxTabs != null ? { maxTabs: pane.maxTabs } : {}),
    }));
    window.localStorage.setItem(saveKey, JSON.stringify(payload));
  }, [panes, saveKey]);

  // â”€â”€ Focused pane sync â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (panes.length === 0) {
      setFocusedPaneId(null);
      return;
    }
    if (!focusedPaneId || !panes.some((pane) => pane.id === focusedPaneId)) {
      setFocusedPaneId(panes[0].id);
    }
  }, [focusedPaneId, panes]);

  // â”€â”€ Pane operations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const removeColumn = useCallback((paneId: string) => {
    setPanes((current) => {
      const floor = minColumns ?? 1;
      if (current.length <= floor) return current;
      const filtered = current.filter((pane) => pane.id !== paneId);
      if (filtered.length === current.length) return current;
      return normalizePaneWidths(filtered);
    });
  }, [minColumns]);

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
      // Already the active tab â€” toggle it off
      if (existingPane.activeTab === tabId) {
        if (existingPane.tabs.length > 1) {
          closeTab(existingPane.id, tabId);
        } else if (panes.length > (minColumns ?? 1)) {
          removeColumn(existingPane.id);
        }
        return;
      }
      // Exists but not active â€” just activate it
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
  }, [focusedPaneId, panes, fallbackTab, closeTab, removeColumn]);

  // â”€â”€ Drag-and-drop: tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const moveTabAcrossPanes = useCallback((toPaneId: string, dragInput?: DragTabState | null) => {
    const drag = dragInput ?? dragStateRef.current;
    if (!drag) return;
    if (drag.fromPaneId === toPaneId) return;

    setFocusedPaneId(toPaneId);
    setPanes((current) => activateTabInPane(current, toPaneId, drag.tabId, fallbackTab, maxTabsPerPane));
  }, [fallbackTab]);

  // â”€â”€ Drag-and-drop: panes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // â”€â”€ Derived state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const paneTemplateStyle = useMemo(() => {
    const total = panes.reduce((sum, pane) => sum + pane.width, 0) || 100;
    return panes.map((pane) => ({
      ...pane,
      widthPercent: (pane.width / total) * 100,
    }));
  }, [panes]);

  const splitterPanels = useMemo(
    () => paneTemplateStyle.map((pane) => ({
      id: pane.id,
      minSize: pane.minWidth ?? MIN_PANE_PERCENT,
      ...(pane.maxWidth != null ? { maxSize: pane.maxWidth } : {}),
    })),
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

  // â”€â”€ Mobile: single-pane tab switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const mobileVisibleTabs = useMemo(
    () => mobileTabs ? tabs.filter((t) => mobileTabs.includes(t.id)) : tabs,
    [tabs, mobileTabs],
  );
  const [mobileTab, setMobileTab] = useState(fallbackTab);
  const resolvedMobileTab = tabs.some((t) => t.id === mobileTab) ? mobileTab : fallbackTab;

  if (isMobile) {
    return (
      <div className={['workbench-shell flex flex-col', className].filter(Boolean).join(' ')}>
        {mobileVisibleTabs.length > 1 && (
          <div className="flex shrink-0 border-b border-border bg-card">
            {mobileVisibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`flex-1 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  resolvedMobileTab === tab.id
                    ? 'border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setMobileTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          {renderContent(resolvedMobileTab)}
        </div>
      </div>
    );
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className={['workbench-shell flex flex-col gap-2', className].filter(Boolean).join(' ')}>
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
              onDragOver={disableDrag ? undefined : (event) => handlePaneDragOver(event, index)}
              onDrop={disableDrag ? undefined : (event) => handlePaneDrop(event, index, pane.id)}
            >
              <div
                className="workbench-pane-tabs"
                onDragOver={disableDrag ? undefined : (event) => handlePaneDragOver(event, index)}
                onDrop={disableDrag ? undefined : (event) => handlePaneDrop(event, index, pane.id)}
              >
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
                <div className="workbench-tab-list">
                  {pane.tabs.map((tabId) => (
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
                      <button
                        type="button"
                        className="workbench-tab-button"
                        onClick={() => setActiveTab(pane.id, tabId)}
                      >
                        {tabLabel(tabId)}
                      </button>
                      {!lockLayout && (
                        <button
                          type="button"
                          aria-label={`Close ${tabLabel(tabId)} tab`}
                          className="workbench-tab-close"
                          onClick={() => closeTabOrColumn(pane, tabId)}
                        >
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!lockLayout && (
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
                            <MenuItem
                              value={`${pane.id}-close-all`}
                              onClick={() => closeAllPanelsInPane(pane.id)}
                            >
                              Close all panels
                            </MenuItem>
                            <MenuItem
                              value={`${pane.id}-remove`}
                              onClick={() => removeColumn(pane.id)}
                              disabled={panes.length <= (minColumns ?? 1)}
                            >
                              Remove pane
                            </MenuItem>
                          </MenuContent>
                        </MenuPositioner>
                      </MenuPortal>
                    </MenuRoot>
                  </div>
                )}
              </div>

              <div
                className="workbench-pane-content"
                onDragOver={disableDrag ? undefined : (event) => handlePaneDragOver(event, index)}
                onDrop={disableDrag ? undefined : (event) => handlePaneDrop(event, index, pane.id)}
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

```

