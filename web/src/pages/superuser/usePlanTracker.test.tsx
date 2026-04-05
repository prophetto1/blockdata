import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FsNode } from '@/lib/fs-access';
import {
  createFile,
  pickDirectory,
  readDirectory,
  readFileContent,
  restoreDirectoryHandle,
  saveDirectoryHandle,
  writeFileContent,
} from '@/lib/fs-access';
import { usePlanTracker } from './usePlanTracker';

vi.mock('@/lib/fs-access', () => ({
  createFile: vi.fn(),
  pickDirectory: vi.fn(),
  readDirectory: vi.fn(),
  readFileContent: vi.fn(),
  restoreDirectoryHandle: vi.fn(),
  saveDirectoryHandle: vi.fn(),
  writeFileContent: vi.fn(),
}));

vi.mock('./MdxEditorSurface', () => ({
  MdxEditorSurface: ({ content }: { content: string }) => <div data-testid="mdx-editor-surface">{content}</div>,
}));

let capturedNavigatorProps: Record<string, unknown> | null = null;
let capturedMetadataProps: Record<string, unknown> | null = null;

vi.mock('./PlanStateNavigator', () => ({
  PlanStateNavigator: (props: Record<string, unknown>) => {
    capturedNavigatorProps = props;
    return <div data-testid="plan-state-navigator-stub" />;
  },
}));

vi.mock('./PlanMetadataPane', () => ({
  PlanMetadataPane: (props: Record<string, unknown>) => {
    capturedMetadataProps = props;
    return <div data-testid="plan-metadata-pane-stub" />;
  },
}));

function createFileNode(
  name: string,
  parentHandle: FileSystemDirectoryHandle,
  handle: FileSystemFileHandle,
  parentPath = '',
): FsNode {
  const path = parentPath ? `${parentPath}/${name}` : name;
  return {
    id: `file:${path}`,
    name,
    path,
    extension: '.md',
    kind: 'file',
    handle,
    parentHandle,
  };
}

function createDirectoryNode(
  name: string,
  parentHandle: FileSystemDirectoryHandle,
  handle: FileSystemDirectoryHandle,
  children: FsNode[],
  parentPath = '',
): FsNode {
  const path = parentPath ? `${parentPath}/${name}` : name;
  return {
    id: `dir:${path}`,
    name,
    path,
    extension: '',
    kind: 'directory',
    handle,
    parentHandle,
    children,
  };
}

function buildPlanMarkdown(input: {
  title: string;
  planId: string;
  status: string;
  version: number;
  productL3: string;
  body: string;
}) {
  return `---
title: ${input.title}
planId: ${input.planId}
artifactType: plan
status: ${input.status}
version: ${input.version}
productL1: blockdata
productL2: frontend
productL3: ${input.productL3}
createdAt: 2026-04-03T10:00:00Z
updatedAt: 2026-04-04T10:00:00Z
---
# ${input.title}

${input.body}
`;
}

function buildNoteMarkdown(input: {
  title: string;
  planId: string;
  artifactType: string;
  status: string;
  version: number;
  body: string;
}) {
  return `---
title: ${input.title}
planId: ${input.planId}
artifactType: ${input.artifactType}
status: ${input.status}
version: ${input.version}
productL1: blockdata
productL2: frontend
productL3: ${input.planId}
createdAt: 2026-04-03T11:00:00Z
updatedAt: 2026-04-04T11:00:00Z
---
# ${input.title}

${input.body}
`;
}

describe('usePlanTracker', () => {
  const rootHandle = {
    name: 'plans',
    queryPermission: vi.fn(async () => 'granted'),
  } as unknown as FileSystemDirectoryHandle;
  const archiveDirHandle = {
    name: 'archive',
    queryPermission: vi.fn(async () => 'granted'),
  } as unknown as FileSystemDirectoryHandle;

  const todoPlanHandle = {} as FileSystemFileHandle;
  const reviewPlanHandle = {} as FileSystemFileHandle;
  const reviewNoteHandle = {} as FileSystemFileHandle;
  const approvedPlanHandle = {} as FileSystemFileHandle;
  const lineagePlanHandle = {} as FileSystemFileHandle;
  const lineageApprovalHandle = {} as FileSystemFileHandle;
  const implementedPlanHandle = {} as FileSystemFileHandle;

  let tree: FsNode[];
  let fileContents: Map<FileSystemFileHandle, string>;
  let createdFiles: Array<{
    parentHandle: FileSystemDirectoryHandle;
    name: string;
    handle: FileSystemFileHandle;
    path: string;
  }>;

  function mountNavigator(result: { current: ReturnType<typeof usePlanTracker> }) {
    capturedNavigatorProps = null;
    return render(<>{result.current.renderContent('plan-state')}</>);
  }

  function mountMetadata(result: { current: ReturnType<typeof usePlanTracker> }) {
    capturedMetadataProps = null;
    return render(<>{result.current.renderContent('metadata')}</>);
  }

  function latestCreatedFile() {
    expect(createdFiles.length).toBeGreaterThan(0);
    return createdFiles.at(-1)!;
  }

  function actionIds() {
    return ((capturedMetadataProps?.availableActions as Array<{ id: string }>) ?? []).map((action) => action.id);
  }

  function setTree() {
    tree = [
      createFileNode('access-control-refactor.v1.md', rootHandle, todoPlanHandle),
      createFileNode('schema-hardening.v1.md', rootHandle, reviewPlanHandle),
      createFileNode('schema-hardening.v1.evaluation.1.md', rootHandle, reviewNoteHandle),
      createFileNode('rollout-automation.v1.md', rootHandle, lineagePlanHandle),
      createFileNode('rollout-automation.v1.approval.1.md', rootHandle, lineageApprovalHandle),
      createFileNode('deployment-validation.v1.md', rootHandle, implementedPlanHandle),
      createDirectoryNode(
        'archive',
        rootHandle,
        archiveDirHandle,
        [createFileNode('launch-readiness.v1.md', archiveDirHandle, approvedPlanHandle, 'archive')],
      ),
    ];
  }

  function setFileContents() {
    fileContents = new Map<FileSystemFileHandle, string>([
      [
        todoPlanHandle,
        buildPlanMarkdown({
          title: 'Access Control Refactor',
          planId: 'access-control-refactor',
          status: 'draft',
          version: 1,
          productL3: 'access-control',
          body: 'Draft access control changes.',
        }),
      ],
      [
        reviewPlanHandle,
        buildPlanMarkdown({
          title: 'Schema Hardening',
          planId: 'schema-hardening',
          status: 'under-review',
          version: 1,
          productL3: 'schema-hardening',
          body: 'Database schema hardening proposal.',
        }),
      ],
      [
        reviewNoteHandle,
        buildNoteMarkdown({
          title: 'Schema Review Note',
          planId: 'schema-hardening',
          artifactType: 'evaluation',
          status: 'under-review',
          version: 1,
          body: 'Legacy review note content.',
        }),
      ],
      [
        approvedPlanHandle,
        buildPlanMarkdown({
          title: 'Launch Readiness',
          planId: 'launch-readiness',
          status: 'approved',
          version: 1,
          productL3: 'launch-readiness',
          body: 'Approved launch plan body.',
        }),
      ],
      [
        lineagePlanHandle,
        buildPlanMarkdown({
          title: 'Rollout Automation',
          planId: 'rollout-automation',
          status: 'in-progress',
          version: 1,
          productL3: 'rollout-automation',
          body: 'Implementation is underway.',
        }),
      ],
      [
        lineageApprovalHandle,
        buildNoteMarkdown({
          title: 'Rollout Approval Note',
          planId: 'rollout-automation',
          artifactType: 'approval',
          status: 'approved',
          version: 1,
          body: 'Approval has already been recorded.',
        }),
      ],
      [
        implementedPlanHandle,
        buildPlanMarkdown({
          title: 'Deployment Validation',
          planId: 'deployment-validation',
          status: 'implemented',
          version: 1,
          productL3: 'deployment-validation',
          body: 'Implementation is complete and ready for verification.',
        }),
      ],
    ]);
  }

  function addCreatedFile(parentHandle: FileSystemDirectoryHandle, name: string, handle: FileSystemFileHandle) {
    const parentPath = parentHandle === archiveDirHandle ? 'archive' : '';
    const node = createFileNode(name, parentHandle, handle, parentPath);

    if (parentHandle === archiveDirHandle) {
      const nestedDirectory = tree.find((entry) => entry.kind === 'directory' && entry.handle === archiveDirHandle);
      nestedDirectory!.children = [...(nestedDirectory!.children ?? []), node];
    } else {
      tree = [...tree, node];
    }

    const path = parentPath ? `${parentPath}/${name}` : name;
    createdFiles.push({ parentHandle, name, handle, path });
    fileContents.set(handle, '');
  }

  beforeEach(() => {
    capturedNavigatorProps = null;
    capturedMetadataProps = null;

    vi.mocked(createFile).mockReset();
    vi.mocked(restoreDirectoryHandle).mockReset();
    vi.mocked(readDirectory).mockReset();
    vi.mocked(readFileContent).mockReset();
    vi.mocked(writeFileContent).mockReset();
    vi.mocked(pickDirectory).mockReset();
    vi.mocked(saveDirectoryHandle).mockReset();

    setTree();
    setFileContents();
    createdFiles = [];

    vi.mocked(restoreDirectoryHandle).mockResolvedValue(rootHandle);
    vi.mocked(readDirectory).mockImplementation(async () => tree);
    vi.mocked(readFileContent).mockImplementation(async (handle) => fileContents.get(handle as FileSystemFileHandle) ?? '');
    vi.mocked(writeFileContent).mockImplementation(async (handle, content) => {
      fileContents.set(handle as FileSystemFileHandle, content);
    });
    vi.mocked(createFile).mockImplementation(async (parentHandle, name) => {
      const handle = {} as FileSystemFileHandle;
      addCreatedFile(parentHandle, name, handle);
      return handle;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps selection coherent when the lifecycle tab changes and clears selection for an empty state', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));
    const navigatorView = mountNavigator(result);
    await waitFor(() => expect(capturedNavigatorProps).not.toBeNull());

    expect(result.current.activeState).toBe('to-do');
    expect(result.current.selectedPlan?.planId).toBe('access-control-refactor');

    await act(async () => {
      (capturedNavigatorProps!.onChangeState as (state: string) => void)('under-review');
    });

    await waitFor(() => expect(result.current.activeState).toBe('under-review'));
    expect(result.current.selectedPlan?.planId).toBe('schema-hardening');
    expect(result.current.selectedArtifact?.artifactType).toBe('plan');

    navigatorView.unmount();
    mountNavigator(result);
    await waitFor(() => expect(capturedNavigatorProps).not.toBeNull());

    await act(async () => {
      (capturedNavigatorProps!.onChangeState as (state: string) => void)('closed');
    });

    await waitFor(() => expect(result.current.activeState).toBe('closed'));
    expect(result.current.selectedPlan).toBeNull();
    expect(result.current.selectedArtifact).toBeNull();
    expect(result.current.documentContent).toBe('');
  });

  it('passes lifecycle-gated actions with no legacy fallback vocabulary into the metadata pane', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('schema-hardening');
    });

    const metadataView = mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());

    expect(capturedMetadataProps!.availableActions).toEqual([
      { id: 'send-back', label: 'Send Back' },
      { id: 'approve', label: 'Approve' },
    ]);
    expect(actionIds()).not.toContain('approve-with-notes');
    expect(actionIds()).not.toContain('reject-with-notes');
    expect(typeof capturedMetadataProps!.onCreateNote).toBe('function');

    metadataView.unmount();
  });

  it('creates artifact-backed notes using the coarse phase-based note mapping without changing lifecycle state', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('launch-readiness');
    });

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());

    await act(async () => {
      await (capturedMetadataProps!.onCreateNote as (input: { title: string; body: string }) => Promise<void>)({
        title: 'Implementation Journal',
        body: 'Started rollout sequencing.',
      });
    });

    const created = latestCreatedFile();
    expect(created.parentHandle).toBe(archiveDirHandle);
    expect(created.name).toBe('launch-readiness.v1.implementation.1.md');
    expect(fileContents.get(created.handle)).toContain('artifactType: implementation-note');
    expect(result.current.selectedPlan?.status).toBe('approved');
    expect(result.current.activeState).toBe('approved');
  });

  it('runs start-work and submit-for-review as plan-only updates and rejects mark-implemented before approval exists', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('access-control-refactor');
    });

    await act(async () => {
      const started = await result.current.runWorkflowAction('start-work');
      expect(started).toBe(true);
    });

    expect(createdFiles).toHaveLength(0);
    expect(fileContents.get(todoPlanHandle)).toContain('status: in-progress');
    await waitFor(() => expect(result.current.activeState).toBe('in-progress'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe('access-control-refactor.v1.md'));

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());
    expect(capturedMetadataProps!.availableActions).toEqual([{ id: 'submit-for-review', label: 'Submit for Review' }]);

    await act(async () => {
      const disallowed = await result.current.runWorkflowAction('mark-implemented');
      expect(disallowed).toBe(false);
    });

    expect(createdFiles).toHaveLength(0);
    expect(fileContents.get(todoPlanHandle)).not.toContain('status: implemented');

    await act(async () => {
      const submitted = await result.current.runWorkflowAction('submit-for-review');
      expect(submitted).toBe(true);
    });

    expect(createdFiles).toHaveLength(0);
    expect(fileContents.get(todoPlanHandle)).toContain('status: under-review');
    await waitFor(() => expect(result.current.activeState).toBe('under-review'));
  });

  it('creates a review note on send-back and keeps the plan selected in its new lifecycle tab', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('schema-hardening');
    });

    await act(async () => {
      const sentBack = await result.current.runWorkflowAction('send-back');
      expect(sentBack).toBe(true);
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('schema-hardening.v1.review.2.md');
    expect(fileContents.get(reviewPlanHandle)).toContain('status: in-progress');
    expect(fileContents.get(created.handle)).toContain('artifactType: review-note');
    await waitFor(() => expect(result.current.selectedPlan?.status).toBe('in-progress'));
    await waitFor(() => expect(result.current.activeState).toBe('in-progress'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(created.path));
  });

  it('creates an approval note, moves to approved, and only exposes mark-implementing from approved', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('schema-hardening');
    });

    await act(async () => {
      const approved = await result.current.runWorkflowAction('approve');
      expect(approved).toBe(true);
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('schema-hardening.v1.approval.1.md');
    expect(fileContents.get(reviewPlanHandle)).toContain('status: approved');
    expect(fileContents.get(created.handle)).toContain('artifactType: approval-note');
    await waitFor(() => expect(result.current.activeState).toBe('approved'));

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());
    expect(capturedMetadataProps!.availableActions).toEqual([{ id: 'mark-implementing', label: 'Mark Implementing' }]);
  });

  it('does not allow close outside verified and marks implementing from approved with an implementation note', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('launch-readiness');
    });

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());
    expect(capturedMetadataProps!.availableActions).toEqual([{ id: 'mark-implementing', label: 'Mark Implementing' }]);

    await act(async () => {
      const closed = await result.current.runWorkflowAction('close');
      expect(closed).toBe(false);
    });

    expect(createdFiles).toHaveLength(0);

    await act(async () => {
      const marked = await result.current.runWorkflowAction('mark-implementing');
      expect(marked).toBe(true);
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('launch-readiness.v1.implementation.1.md');
    expect(fileContents.get(approvedPlanHandle)).toContain('status: in-progress');
    expect(fileContents.get(created.handle)).toContain('artifactType: implementation-note');
    await waitFor(() => expect(result.current.activeState).toBe('in-progress'));
  });

  it('allows mark-implemented only when approval exists for the current lineage', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('rollout-automation');
    });

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());
    expect(capturedMetadataProps!.availableActions).toEqual([
      { id: 'submit-for-review', label: 'Submit for Review' },
      { id: 'mark-implemented', label: 'Mark Implemented' },
    ]);

    await act(async () => {
      const marked = await result.current.runWorkflowAction('mark-implemented');
      expect(marked).toBe(true);
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('rollout-automation.v1.implementation.1.md');
    expect(fileContents.get(lineagePlanHandle)).toContain('status: implemented');
    expect(fileContents.get(created.handle)).toContain('artifactType: implementation-note');
    await waitFor(() => expect(result.current.activeState).toBe('implemented'));
  });

  it('requests verification and then closes, creating verification and closure artifacts only on the locked states', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('deployment-validation');
    });

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());
    expect(capturedMetadataProps!.availableActions).toEqual([
      { id: 'request-verification', label: 'Request Verification' },
    ]);

    await act(async () => {
      const verified = await result.current.runWorkflowAction('request-verification');
      expect(verified).toBe(true);
    });

    const verificationFile = latestCreatedFile();
    expect(verificationFile.name).toBe('deployment-validation.v1.verification.1.md');
    expect(fileContents.get(implementedPlanHandle)).toContain('status: verified');
    expect(fileContents.get(verificationFile.handle)).toContain('artifactType: verification-note');
    await waitFor(() => expect(result.current.activeState).toBe('verified'));

    mountMetadata(result);
    await waitFor(() => expect(capturedMetadataProps).not.toBeNull());
    expect(capturedMetadataProps!.availableActions).toEqual([{ id: 'close', label: 'Close' }]);

    await act(async () => {
      const closed = await result.current.runWorkflowAction('close');
      expect(closed).toBe(true);
    });

    const closureFile = latestCreatedFile();
    expect(closureFile.name).toBe('deployment-validation.v1.closure.1.md');
    expect(fileContents.get(implementedPlanHandle)).toContain('status: closed');
    expect(fileContents.get(closureFile.handle)).toContain('artifactType: closure-note');
    await waitFor(() => expect(result.current.activeState).toBe('closed'));
  });

  it('keeps dirty-action gating in front of workflow side effects until resolved', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(5));

    act(() => {
      result.current.selectPlan('schema-hardening');
      result.current.setDocumentContent('# Schema Hardening\n\nUnsaved approval edits.');
    });

    await act(async () => {
      const started = await result.current.runWorkflowAction('approve');
      expect(started).toBe(false);
    });

    expect(result.current.pendingAction).toEqual({ actionId: 'approve' });
    expect(createdFiles).toHaveLength(0);
    expect(fileContents.get(reviewPlanHandle)).not.toContain('status: approved');

    await act(async () => {
      const resolution = await result.current.resolvePendingAction('save');
      expect(resolution).toEqual({
        actionId: 'approve',
        shouldProceed: true,
        resolution: 'save',
      });
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('schema-hardening.v1.approval.1.md');
    expect(fileContents.get(reviewPlanHandle)).toContain('Unsaved approval edits.');
    expect(fileContents.get(reviewPlanHandle)).toContain('status: approved');
  });
});
