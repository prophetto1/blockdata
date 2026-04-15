import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/hooks/useRuns', () => ({
  useRuns: () => ({
    runs: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('@/components/blocks/BlockViewerGridRDG', () => ({
  BlockViewerGridRDG: () => <div data-testid="block-viewer-grid-rdg-mock">grid</div>,
}));

async function importPage() {
  return import('./BlockViewerGridDemo');
}

describe('BlockViewerGridDemo', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses the same page-origin content padding standard as other normalized superuser pages', async () => {
    const { Component } = await importPage();
    render(<Component />);

    const content = screen.getByTestId('block-viewer-grid-page-content');

    expect(content).toHaveClass('px-4', 'pt-3');
    expect(content).not.toHaveClass('p-4');
  });
});
