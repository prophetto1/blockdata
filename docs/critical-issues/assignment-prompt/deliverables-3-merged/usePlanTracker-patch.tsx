// ============================================================
// Deliverable 5 — Patch for: web/src/pages/superuser/usePlanTracker.tsx
//
// Single change: pass `loading` prop to PlanDocumentPane so the center
// pane can distinguish "loading workspace" from "no artifact selected".
//
// The current renderContent already delegates all three panes correctly
// and showLegacyPaneFallback is already disabled. No other changes needed.
// ============================================================

// In renderContent, find the 'document' tab branch (~line 707-721).
// Replace:

if (tabId === 'document') {
  return (
    <PlanDocumentPane
      artifact={selectedArtifact}
      content={documentContent}
      diffMarkdown={originalContent}
      fileKey={fileKey}
      viewMode={viewMode}
      dirty={dirty}
      hasDirectory={hasDirectory}
      onChange={setDocumentContent}
      onSave={() => void saveCurrentDocument()}
      onOpenPlansDirectory={() => void openPlansDirectory()}
    />
  );
}

// With (adds loading prop):

if (tabId === 'document') {
  return (
    <PlanDocumentPane
      artifact={selectedArtifact}
      content={documentContent}
      diffMarkdown={originalContent}
      fileKey={fileKey}
      viewMode={viewMode}
      dirty={dirty}
      hasDirectory={hasDirectory}
      loading={loading}
      onChange={setDocumentContent}
      onSave={() => void saveCurrentDocument()}
      onOpenPlansDirectory={() => void openPlansDirectory()}
    />
  );
}

// No other changes to usePlanTracker.tsx are required.
// The hook already:
//   - Sets showLegacyPaneFallback = false (line 665)
//   - Renders PlanStateNavigator, PlanDocumentPane, PlanMetadataPane unconditionally
//   - Passes nullable selectedPlan/selectedArtifact so panes handle placeholder mode internally
