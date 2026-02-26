import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FlowWorkbench from './FlowWorkbench';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('FlowWorkbench', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
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
});
