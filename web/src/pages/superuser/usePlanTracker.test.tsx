import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('usePlanTracker', () => {
  const rootHandle = {
    name: 'plans',
    queryPermission: vi.fn(async () => 'granted'),
  } as unknown as FileSystemDirectoryHandle;
  const nestedDirHandle = {
    name: 'agchain',
    queryPermission: vi.fn(async () => 'granted'),
  } as unknown as FileSystemDirectoryHandle;

  const refactorPlanHandle = {} as FileSystemFileHandle;
  const refactorEvalHandle = {} as FileSystemFileHandle;
  const kickoffHandle = {} as FileSystemFileHandle;

  let tree: FsNode[];
  let fileContents: Map<FileSystemFileHandle, string>;
  let createdFiles: Array<{
    parentHandle: FileSystemDirectoryHandle;
    name: string;
    handle: FileSystemFileHandle;
    path: string;
  }>;

  function setTree() {
    tree = [
      createFileNode('refactor-database-schema.md', rootHandle, refactorPlanHandle),
      createDirectoryNode(
        'agchain',
        rootHandle,
        nestedDirHandle,
        [
          createFileNode('refactor-database-schema-plan-evaluation.md', nestedDirHandle, refactorEvalHandle, 'agchain'),
          createFileNode('initial-project-setup-plan-evaluation.md', nestedDirHandle, kickoffHandle, 'agchain'),
        ],
      ),
    ];
  }

  function setFileContents() {
    fileContents = new Map<FileSystemFileHandle, string>([
      [refactorPlanHandle, '# Refactor Database Schema\n\nDraft plan body.'],
      [
        refactorEvalHandle,
        `---
title: Schema Evaluation
planId: refactor-database-schema
artifactType: evaluation
status: under-review
version: 1
---
# Schema Evaluation

Current schema limitations identified.`,
      ],
      [
        kickoffHandle,
        `---
title: Project Kickoff Review
planId: initial-project-setup
artifactType: evaluation
status: under-review
version: 1
---
# Project Kickoff Review

Initial setup is ready for review.`,
      ],
    ]);
  }

  function addCreatedFile(parentHandle: FileSystemDirectoryHandle, name: string, handle: FileSystemFileHandle) {
    const parentPath = parentHandle === nestedDirHandle ? 'agchain' : '';
    const node = createFileNode(name, parentHandle, handle, parentPath);

    if (parentHandle === nestedDirHandle) {
      const nestedDirectory = tree.find((entry) => entry.kind === 'directory' && entry.handle === nestedDirHandle);
      nestedDirectory!.children = [...(nestedDirectory!.children ?? []), node];
    } else {
      tree = [...tree, node];
    }

    const path = parentPath ? `${parentPath}/${name}` : name;
    createdFiles.push({ parentHandle, name, handle, path });
    fileContents.set(handle, '');
  }

  function latestCreatedFile() {
    expect(createdFiles.length).toBeGreaterThan(0);
    return createdFiles.at(-1)!;
  }

  beforeEach(() => {
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

  it('restores a previously chosen plans directory and groups markdown files into plan units', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    expect(restoreDirectoryHandle).toHaveBeenCalledWith('plan-tracker-test');
    expect(readDirectory).toHaveBeenCalledWith(rootHandle);
    expect(result.current.selectedPlan?.planId).toBe('initial-project-setup');
    expect(result.current.planUnits.map((unit) => unit.planId)).toEqual([
      'initial-project-setup',
      'refactor-database-schema',
    ]);
  });

  it('updates the selected artifact when a different plan unit is selected', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    expect(result.current.selectedPlan?.planId).toBe('refactor-database-schema');
    expect(result.current.selectedArtifact?.title).toBe('Refactor Database Schema');

    const evaluation = result.current.selectedPlan?.artifacts.find((artifact) => artifact.artifactType === 'evaluation');
    expect(evaluation).toBeDefined();

    act(() => {
      result.current.selectArtifact(evaluation!.artifactId);
    });

    expect(result.current.selectedArtifact?.title).toBe('Schema Evaluation');
    expect(result.current.documentContent).toContain('Current schema limitations identified.');
  });

  it('saves the active document and refreshes plan units after a write', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
      result.current.setDocumentContent('# Refactor Database Schema\n\nUpdated after review.');
    });

    expect(result.current.dirty).toBe(true);

    await act(async () => {
      await result.current.saveCurrentDocument();
    });

    await waitFor(() => expect(result.current.dirty).toBe(false));

    expect(writeFileContent).toHaveBeenCalledWith(refactorPlanHandle, '# Refactor Database Schema\n\nUpdated after review.');
    expect(vi.mocked(readDirectory).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.current.documentContent).toContain('Updated after review.');
  });

  it('gates dirty workflow actions until the user saves, discards, or cancels', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedPlan?.planId).toBe('refactor-database-schema'));

    act(() => {
      result.current.setDocumentContent('# Refactor Database Schema\n\nDirty edits.');
    });

    expect(result.current.dirty).toBe(true);

    act(() => {
      expect(result.current.requestWorkflowAction('create-revision')).toBe(false);
    });

    expect(result.current.pendingAction).toEqual({ actionId: 'create-revision' });

    await act(async () => {
      const resolution = await result.current.resolvePendingAction('cancel');
      expect(resolution).toEqual({
        actionId: 'create-revision',
        shouldProceed: false,
        resolution: 'cancel',
      });
    });

    expect(result.current.pendingAction).toBeNull();
    expect(result.current.dirty).toBe(true);
    expect(result.current.documentContent).toContain('Dirty edits.');
    expect(writeFileContent).not.toHaveBeenCalled();

    act(() => {
      expect(result.current.requestWorkflowAction('create-revision')).toBe(false);
    });

    await act(async () => {
      const resolution = await result.current.resolvePendingAction('discard');
      expect(resolution).toEqual({
        actionId: 'create-revision',
        shouldProceed: true,
        resolution: 'discard',
      });
    });

    expect(result.current.pendingAction).toBeNull();
    expect(result.current.dirty).toBe(false);
    const createdRevision = latestCreatedFile();
    expect(createdRevision.name).toBe('refactor-database-schema.v2.md');
    expect(fileContents.get(refactorPlanHandle)).toContain('status: superseded');
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(createdRevision.path));
  });

  it('saves the active document before allowing a gated workflow action to continue', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedPlan?.planId).toBe('refactor-database-schema'));

    act(() => {
      result.current.setDocumentContent('# Refactor Database Schema\n\nReady for save gate.');
    });

    act(() => {
      expect(result.current.requestWorkflowAction('approve-with-notes')).toBe(false);
    });

    await act(async () => {
      const resolution = await result.current.resolvePendingAction('save');
      expect(resolution).toEqual({
        actionId: 'approve-with-notes',
        shouldProceed: true,
        resolution: 'save',
      });
    });

    await waitFor(() => expect(result.current.dirty).toBe(false));

    expect(writeFileContent).toHaveBeenCalledWith(refactorPlanHandle, '# Refactor Database Schema\n\nReady for save gate.');
    const createdApproval = latestCreatedFile();
    expect(createdApproval.name).toBe('refactor-database-schema.v1.approval.1.md');
    expect(result.current.pendingAction).toBeNull();
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(createdApproval.path));
  });

  it('creates a rejection artifact and normalizes the selected legacy file in place', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedArtifact?.artifactType).toBe('plan'));

    await act(async () => {
      await result.current.runWorkflowAction('reject-with-notes');
    });

    const created = latestCreatedFile();
    expect(created.parentHandle).toBe(rootHandle);
    expect(created.name).toBe('refactor-database-schema.v1.evaluation.2.md');
    expect(fileContents.get(refactorPlanHandle)).toContain('artifactType: plan');
    expect(fileContents.get(refactorPlanHandle)).toContain('status: rejected');
    expect(fileContents.get(refactorPlanHandle)).toContain('planId: refactor-database-schema');
    expect(fileContents.get(created.handle)).toContain('artifactType: evaluation');
    expect(fileContents.get(created.handle)).toContain('status: rejected');
    await waitFor(() => expect(result.current.selectedPlan?.status).toBe('rejected'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(created.path));
  });

  it('continues an approval action after the save gate resolves and creates an approval artifact', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedPlan?.planId).toBe('refactor-database-schema'));

    act(() => {
      result.current.setDocumentContent('# Refactor Database Schema\n\nReady for approval.');
    });

    await act(async () => {
      const started = await result.current.runWorkflowAction('approve-with-notes');
      expect(started).toBe(false);
    });

    expect(result.current.pendingAction).toEqual({ actionId: 'approve-with-notes' });

    await act(async () => {
      const resolution = await result.current.resolvePendingAction('save');
      expect(resolution).toEqual({
        actionId: 'approve-with-notes',
        shouldProceed: true,
        resolution: 'save',
      });
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('refactor-database-schema.v1.approval.1.md');
    expect(fileContents.get(refactorPlanHandle)).toContain('status: approved');
    expect(fileContents.get(refactorPlanHandle)).toContain('Ready for approval.');
    expect(fileContents.get(created.handle)).toContain('artifactType: approval');
    expect(fileContents.get(created.handle)).toContain('status: approved');
    await waitFor(() => expect(result.current.selectedPlan?.status).toBe('approved'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(created.path));
  });

  it('creates a new revision, supersedes the previous plan file, and selects the new revision', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedArtifact?.artifactType).toBe('plan'));

    await act(async () => {
      await result.current.runWorkflowAction('create-revision');
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('refactor-database-schema.v2.md');
    expect(fileContents.get(refactorPlanHandle)).toContain('status: superseded');
    expect(fileContents.get(created.handle)).toContain('artifactType: plan');
    expect(fileContents.get(created.handle)).toContain('status: draft');
    expect(fileContents.get(created.handle)).toContain('version: 2');
    await waitFor(() => expect(result.current.selectedPlan?.planId).toBe('refactor-database-schema'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(created.path));
    await waitFor(() => expect(result.current.selectedArtifact?.version).toBe(2));
  });

  it('creates an implementation note artifact and updates the plan status', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedArtifact?.artifactType).toBe('plan'));

    await act(async () => {
      await result.current.runWorkflowAction('attach-implementation-note');
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('refactor-database-schema.v1.implementation.1.md');
    expect(fileContents.get(refactorPlanHandle)).toContain('status: in-progress');
    expect(fileContents.get(created.handle)).toContain('artifactType: implementation-note');
    expect(fileContents.get(created.handle)).toContain('status: in-progress');
    await waitFor(() => expect(result.current.selectedPlan?.status).toBe('in-progress'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(created.path));
  });

  it('creates a verification artifact and updates the plan status', async () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    await waitFor(() => expect(result.current.planUnits).toHaveLength(2));

    act(() => {
      result.current.selectPlan('refactor-database-schema');
    });

    await waitFor(() => expect(result.current.selectedArtifact?.artifactType).toBe('plan'));

    await act(async () => {
      await result.current.runWorkflowAction('attach-verification');
    });

    const created = latestCreatedFile();
    expect(created.name).toBe('refactor-database-schema.v1.verification.1.md');
    expect(fileContents.get(refactorPlanHandle)).toContain('status: verified');
    expect(fileContents.get(created.handle)).toContain('artifactType: verification-note');
    expect(fileContents.get(created.handle)).toContain('status: verified');
    await waitFor(() => expect(result.current.selectedPlan?.status).toBe('verified'));
    await waitFor(() => expect(result.current.selectedArtifact?.path).toBe(created.path));
  });
});
