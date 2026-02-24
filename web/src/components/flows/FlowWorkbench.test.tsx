import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import FlowWorkbench from './FlowWorkbench';

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('FlowWorkbench', () => {
  it('renders topology workbench without throwing', () => {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: MockResizeObserver,
      writable: true,
      configurable: true,
    });

    expect(() => {
      render(
        <FlowWorkbench
          flowId="flow-1"
          flowName="Flow One"
        />,
      );
    }).not.toThrow();
  });
});
