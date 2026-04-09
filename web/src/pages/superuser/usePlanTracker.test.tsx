import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FsNode } from '@/lib/fs-access';

import { usePlanTracker } from './usePlanTracker';

const workspaceFileTreeMock = vi.fn();
const localFilePreviewMock = vi.fn();

vi.mock('./WorkspaceFileTree', () => ({
  WorkspaceFileTree: (props: Record<string, unknown>) => {
    workspaceFileTreeMock(props);
    return <div data-testid="workspace-file-tree-stub" />;
  },
}));

vi.mock('@/components/documents/LocalFilePreview', () => ({
  LocalFilePreview: (props: Record<string, unknown>) => {
    localFilePreviewMock(props);
    return <div data-testid="local-file-preview-stub" />;
  },
}));

describe('usePlanTracker', () => {
  it('renders a read-only local file tree in the first pane', () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));

    render(<>{result.current.renderContent('files')}</>);

    expect(screen.getByTestId('workspace-file-tree-stub')).toBeInTheDocument();
    expect(workspaceFileTreeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        storeKey: 'plan-tracker-test',
        readOnly: true,
        onSelectFile: expect.any(Function),
        onRootHandle: expect.any(Function),
      }),
    );
  });

  it('forwards the selected local file into the preview pane', () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));
    const selectedNode: FsNode = {
      id: 'file:notes/example.md',
      name: 'example.md',
      path: 'notes/example.md',
      extension: '.md',
      kind: 'file',
      handle: {} as FileSystemFileHandle,
    };

    render(<>{result.current.renderContent('files')}</>);

    const latestTreeProps = workspaceFileTreeMock.mock.calls.at(-1)?.[0] as {
      onSelectFile: (node: FsNode) => void;
    };

    act(() => {
      latestTreeProps.onSelectFile(selectedNode);
    });

    render(<>{result.current.renderContent('preview')}</>);

    expect(screen.getByTestId('local-file-preview-stub')).toBeInTheDocument();
    expect(localFilePreviewMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ node: selectedNode }),
    );
  });

  it('clears the preview selection when the root handle changes and leaves the right pane empty', () => {
    const { result } = renderHook(() => usePlanTracker('plan-tracker-test'));
    const selectedNode: FsNode = {
      id: 'file:notes/example.md',
      name: 'example.md',
      path: 'notes/example.md',
      extension: '.md',
      kind: 'file',
      handle: {} as FileSystemFileHandle,
    };

    render(<>{result.current.renderContent('files')}</>);

    const latestTreeProps = workspaceFileTreeMock.mock.calls.at(-1)?.[0] as {
      onSelectFile: (node: FsNode) => void;
      onRootHandle: () => void;
    };

    act(() => {
      latestTreeProps.onSelectFile(selectedNode);
      latestTreeProps.onRootHandle();
    });

    render(<>{result.current.renderContent('preview')}</>);
    expect(localFilePreviewMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ node: null }),
    );

    render(<>{result.current.renderContent('placeholder')}</>);
    expect(screen.getByTestId('plan-tracker-placeholder-pane')).toBeEmptyDOMElement();
  });
});
