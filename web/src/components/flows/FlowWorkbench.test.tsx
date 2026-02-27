import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FlowWorkbench from './FlowWorkbench';

const { edgeJsonMock } = vi.hoisted(() => ({
  edgeJsonMock: vi.fn(),
}));

vi.mock('@/lib/edge', () => ({
  edgeJson: edgeJsonMock,
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function createMockDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  return {
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ''),
    effectAllowed: '',
  } as unknown as DataTransfer;
}

describe('FlowWorkbench', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    edgeJsonMock.mockReset();
    edgeJsonMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes('?source=true')) {
        return {
          id: 'flow-test',
          namespace: 'default',
          revision: 2,
          source: `id: flow-one
namespace: default

tasks:
  - id: hello
    type: io.kestra.plugin.core.log.Log
    message: "from-server"`,
        };
      }
      if (path === 'flows/validate') return [];
      if (init?.method === 'PUT') {
        return {
          id: 'flow-test',
          namespace: 'default',
          revision: 3,
          source: String(init.body ?? ''),
        };
      }
      return {};
    });
  });

  it('renders topology workbench without throwing', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    expect(() => {
      render(
        <FlowWorkbench
          flowId="flow-test-a"
          flowName="Flow One"
          namespace="default"
        />,
      );
    }).not.toThrow();
  });

  it('shows close controls for single-tab panes and closes the pane on click', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-b"
        flowName="Flow One"
        namespace="default"
      />,
    );

    expect(screen.getAllByLabelText(/^Close .+ tab$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText('Move column')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Close Flow Code tab'));

    expect(screen.getAllByLabelText('Move column')).toHaveLength(1);
  });

  it('renders Kestra-style edit controls and actions menu items', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-c"
        flowName="Flow One"
        namespace="default"
      />,
    );

    expect(screen.getAllByRole('button', { name: 'Flow Code' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'No-code' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Topology' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Documentation' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Files' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Blueprints' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByText('Add column')).not.toBeInTheDocument();
    expect(screen.queryByText('Reset split')).not.toBeInTheDocument();
  });

  it('shows export/delete/copy entries from Actions menu', async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-d"
        flowName="Flow One"
        namespace="default"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Actions' }));

    expect(await screen.findByText('Export flow')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders non-dropzone file upload controls when Files panel is opened', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-e"
        flowName="Flow One"
        namespace="default"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);

    expect(screen.getByLabelText('Files tree')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload file' })).toBeInTheDocument();
    expect(screen.getByText('No files uploaded yet.')).toBeInTheDocument();
    expect(screen.queryByText('Drag and drop files here')).not.toBeInTheDocument();
  });

  it('opens create-file dialog from Files toolbar action', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-files-create-file"
        flowName="Flow One"
        namespace="default"
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);

    const createButton = screen.getByRole('button', { name: 'Create file' });
    fireEvent.pointerDown(createButton);
    fireEvent.click(createButton);
    const fileNameInput = screen.getByLabelText('File name') as HTMLInputElement;
    expect(fileNameInput).toBeInTheDocument();
    fireEvent.change(fileNameInput, { target: { value: 'notes.txt' } });
    expect(fileNameInput.value).toBe('notes.txt');
  });

  it('sets dataTransfer payload when starting a column drag', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    const dataTransfer = createMockDataTransfer();

    render(
      <FlowWorkbench
        flowId="flow-test-e3"
        flowName="Flow One"
        namespace="default"
      />,
    );

    fireEvent.dragStart(screen.getAllByLabelText('Move column')[0], { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalled();
  });

  it('reorders columns when dropping a dragged column on another pane', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    const dataTransfer = createMockDataTransfer();

    render(
      <FlowWorkbench
        flowId="flow-test-e4"
        flowName="Flow One"
        namespace="default"
      />,
    );

    const activeTabLabels = () => Array.from(
      document.querySelectorAll('.flow-workbench-pane .flow-workbench-tab.is-active .flow-workbench-tab-button'),
    )
      .map((node) => node.textContent?.trim())
      .filter((value): value is string => Boolean(value));

    const labelsBefore = activeTabLabels();
    expect(labelsBefore).toHaveLength(2);

    const handles = screen.getAllByLabelText('Move column');
    const panes = Array.from(document.querySelectorAll('.flow-workbench-pane'));
    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragOver(panes[1], { dataTransfer });
    fireEvent.drop(panes[1], { dataTransfer });

    expect(activeTabLabels()).toEqual([labelsBefore[1], labelsBefore[0]]);
  });

  it('reorders columns even if dragEnd fires before drop', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    const dataTransfer = createMockDataTransfer();

    render(
      <FlowWorkbench
        flowId="flow-test-e4-dragend-first"
        flowName="Flow One"
        namespace="default"
      />,
    );

    const activeTabLabels = () => Array.from(
      document.querySelectorAll('.flow-workbench-pane .flow-workbench-tab.is-active .flow-workbench-tab-button'),
    )
      .map((node) => node.textContent?.trim())
      .filter((value): value is string => Boolean(value));

    const labelsBefore = activeTabLabels();
    expect(labelsBefore).toHaveLength(2);

    const handles = screen.getAllByLabelText('Move column');
    const panes = Array.from(document.querySelectorAll('.flow-workbench-pane'));
    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragEnd(handles[0], { dataTransfer });
    fireEvent.dragOver(panes[1], { dataTransfer });
    fireEvent.drop(panes[1], { dataTransfer });

    expect(activeTabLabels()).toEqual([labelsBefore[1], labelsBefore[0]]);
  });

  it('reorders columns when dropped on pane tab strip (not just panel body)', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    const dataTransfer = createMockDataTransfer();

    render(
      <FlowWorkbench
        flowId="flow-test-pane-tab-drop"
        flowName="Flow One"
        namespace="default"
      />,
    );

    const activeTabLabels = () => Array.from(
      document.querySelectorAll('.flow-workbench-pane .flow-workbench-tab.is-active .flow-workbench-tab-button'),
    )
      .map((node) => node.textContent?.trim())
      .filter((value): value is string => Boolean(value));

    const labelsBefore = activeTabLabels();
    expect(labelsBefore).toHaveLength(2);

    const handles = screen.getAllByLabelText('Move column');
    const paneTabStrips = Array.from(document.querySelectorAll('.flow-workbench-pane-tabs'));
    fireEvent.dragStart(handles[0], { dataTransfer });
    fireEvent.dragOver(paneTabStrips[1], { dataTransfer });
    fireEvent.drop(paneTabStrips[1], { dataTransfer });

    expect(activeTabLabels()).toEqual([labelsBefore[1], labelsBefore[0]]);
  });

  it('creates a new column by splitting the active tab from a multi-tab panel', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-split"
        flowName="Flow One"
        namespace="default"
      />,
    );

    expect(screen.getAllByLabelText('Move column')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Files' })[0]);
    fireEvent.click(screen.getByTitle('Split panel'));
    expect(screen.getAllByLabelText('Move column')).toHaveLength(3);
  });

  it('exposes Ark splitter handle semantics on resize separators', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-f"
        flowName="Flow One"
        namespace="default"
      />,
    );

    const separators = screen.getAllByRole('separator', { name: 'Resize pane' });
    expect(separators.length).toBeGreaterThan(0);
    expect(separators[0]).toHaveAttribute('aria-valuenow');
  });

  it('loads flow source from backend on mount', async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-source"
        flowName="Flow One"
        namespace="default"
      />,
    );

    await waitFor(() => {
      expect(edgeJsonMock).toHaveBeenCalledWith('flows/default/flow-test-source?source=true');
    });

    await waitFor(() => {
      const value = (screen.getByLabelText('Flow code editor') as HTMLTextAreaElement).value;
      expect(value).toContain('from-server');
    });
  });

  it('validates and saves flow code through backend endpoints', async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-save"
        flowName="Flow One"
        namespace="default"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Validate flow' }));
    await waitFor(() => {
      expect(edgeJsonMock).toHaveBeenCalledWith(
        'flows/validate',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    const editor = screen.getByLabelText('Flow code editor');
    fireEvent.change(editor, {
      target: {
        value: `id: flow-one
namespace: default
tasks: []
# changed`,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(edgeJsonMock).toHaveBeenCalledWith(
        'flows/default/flow-test-save',
        expect.objectContaining({
          method: 'PUT',
        }),
      );
    });
  });

  it('tracks unsaved state and enables Save only when code changes', async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    render(
      <FlowWorkbench
        flowId="flow-test-dirty"
        flowName="Flow One"
        namespace="default"
      />,
    );

    await waitFor(() => {
      expect(edgeJsonMock).toHaveBeenCalledWith('flows/default/flow-test-dirty?source=true');
    });

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton).toBeDisabled();

    const editor = screen.getByLabelText('Flow code editor');
    fireEvent.change(editor, {
      target: {
        value: `id: flow-one
namespace: default
tasks: []
# changed`,
      },
    });

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(saveButton).toBeEnabled();
  });

  it('renders validation issue list when validator returns violations', async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    edgeJsonMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes('?source=true')) {
        return {
          id: 'flow-test',
          namespace: 'default',
          revision: 2,
          source: `id: flow-one
namespace: default
tasks: []`,
        };
      }
      if (path === 'flows/validate') {
        return [
          { path: 'id', message: 'Top-level id is required' },
          { path: 'tasks', message: 'Top-level tasks is required' },
        ];
      }
      if (init?.method === 'PUT') {
        return {
          id: 'flow-test',
          namespace: 'default',
          revision: 3,
          source: String(init.body ?? ''),
        };
      }
      return {};
    });

    render(
      <FlowWorkbench
        flowId="flow-test-validation"
        flowName="Flow One"
        namespace="default"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Validate flow' }));

    expect(await screen.findByText('Validation issues')).toBeInTheDocument();
    expect(screen.getByText('id: Top-level id is required')).toBeInTheDocument();
    expect(screen.getByText('tasks: Top-level tasks is required')).toBeInTheDocument();
  });

  it('allows dismissing load error notices', async () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    edgeJsonMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.includes('?source=true')) {
        throw new Error('Failed to fetch');
      }
      if (path === 'flows/validate') return [];
      if (init?.method === 'PUT') {
        return {
          id: 'flow-test',
          namespace: 'default',
          revision: 3,
          source: String(init.body ?? ''),
        };
      }
      return {};
    });

    render(
      <FlowWorkbench
        flowId="flow-test-error-dismiss"
        flowName="Flow One"
        namespace="default"
      />,
    );

    expect(await screen.findByText(/Unable to load flow source:/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByText(/Unable to load flow source:/i)).not.toBeInTheDocument();
  });
});
