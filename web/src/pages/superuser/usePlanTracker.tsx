/* eslint-disable react-refresh/only-export-components */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChecklist, IconListDetails, IconNotes } from '@tabler/icons-react';

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
import { PlanDocumentPreview } from './PlanDocumentPreview';
import { PlanMetadataPane } from './PlanMetadataPane';
import {
  buildArtifactFilename,
  derivePlanStem,
  groupPlanDocuments,
  isTrackerMetadataComplete,
  latestPlanArtifact,
  normalizeLifecycleState,
  nextArtifactSequence,
  nextVersionNumber,
  serializePlanTrackerDocument,
  workflowArtifactStatus,
  workflowArtifactTitle,
  workflowArtifactType,
  workflowPlanStatus,
  type LifecycleState,
  type PlanArtifactSummary,
  type PlanTrackerMetadata,
  type PlanUnit,
  type WorkflowActionId,
} from './planTrackerModel';
import { PlanStateNavigator } from './PlanStateNavigator';

export const PLAN_TRACKER_TABS = [
  { id: 'plan-state', label: 'Plans', icon: IconChecklist },
  { id: 'document', label: 'Document', icon: IconNotes },
  { id: 'metadata', label: 'Metadata', icon: IconListDetails },
];

export const PLAN_TRACKER_DEFAULT_PANES: Pane[] = normalizePaneWidths([
  { id: 'pane-1', tabs: ['plan-state'], activeTab: 'plan-state', width: 26 },
  { id: 'pane-2', tabs: ['document'], activeTab: 'document', width: 52 },
  { id: 'pane-3', tabs: ['metadata'], activeTab: 'metadata', width: 22 },
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
  activeState: LifecycleState;
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
  const [activeState, setActiveState] = useState<LifecycleState>('to-do');
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
      setActiveState(nextPlan ? normalizeLifecycleState(nextPlan.status) : 'to-do');
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
      setActiveState(plan ? normalizeLifecycleState(plan.status) : activeState);
      setDocumentContentState(artifact?.content ?? '');
      setOriginalContent(artifact?.content ?? '');
      setFileKey(artifact?.artifactId ?? 'plan-tracker-empty');
      setPendingAction(null);
    },
    [activeState, planUnits],
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
      if (tabId === 'plan-state') {
        if (!planUnits.length) {
          return (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading plans directory…' : 'Open the docs/plans directory to start the tracker.'}
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

        return (
          <PlanStateNavigator
            activeState={activeState}
            onChangeState={setActiveState}
            planUnits={planUnits}
            selectedPlanId={selectedPlan?.planId ?? null}
            selectedArtifactId={selectedArtifact?.artifactId ?? ''}
            onSelectPlan={selectPlan}
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
      activeState,
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
    activeState,
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
