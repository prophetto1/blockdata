// ============================================================
// Deliverable 4 — Patch for: web/src/pages/superuser/usePlanTracker.tsx
//
// 4A. Add this import at the top of usePlanTracker.tsx
// 4B. Replace the existing renderContent with the version below
// 4C. Remove the old whole-pane empty-state branches
// ============================================================

// --- 4A: Add import ---

import { PlanDocumentPane } from './PlanDocumentPane';

// --- 4B: Replace renderContent with this version ---

const renderContent = useCallback(
  (tabId: string) => {
    const hasDirectory = Boolean(directoryHandleRef.current);

    if (tabId === 'plan-state') {
      return (
        <PlanStateNavigator
          activeState={activeState}
          onChangeState={selectState}
          planUnits={planUnits}
          selectedPlanId={selectedPlan?.planId ?? null}
          selectedArtifactId={selectedArtifact?.artifactId ?? null}
          onSelectPlan={selectPlan}
          onSelectArtifact={selectArtifact}
          hasDirectory={hasDirectory}
          loading={loading}
          error={error}
          onOpenDirectory={() => void openPlansDirectory()}
        />
      );
    }

    if (tabId === 'document') {
      return (
        <PlanDocumentPane
          artifact={selectedArtifact}
          hasDirectory={hasDirectory}
          loading={loading}
          dirty={dirty}
          documentContent={documentContent}
          originalContent={originalContent}
          fileKey={fileKey}
          viewMode={viewMode}
          onChange={setDocumentContent}
          onSave={() => void saveCurrentDocument()}
          onOpenDirectory={() => void openPlansDirectory()}
        />
      );
    }

    if (tabId === 'metadata') {
      return (
        <PlanMetadataPane
          plan={selectedPlan}
          artifact={selectedArtifact}
          dirty={dirty}
          availableActions={availableActions}
          pendingAction={pendingAction}
          onAction={(actionId) => void runWorkflowAction(actionId)}
          onCreateNote={(input) => void createNoteArtifact(input)}
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
    availableActions,
    createNoteArtifact,
    dirty,
    documentContent,
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
    selectState,
    selectedArtifact,
    selectedPlan,
    setDocumentContent,
    viewMode,
  ],
);

// --- 4C: Remove the old whole-pane empty-state returns ---
//
// Delete the old renderContent branches that returned:
//   - centered "Open Plans Directory" inside the left pane in place of the navigator
//   - bare "No artifact selected."
//   - bare "No metadata available."
//
// Those are the exact state-gating behaviors Phase 2 eliminates.