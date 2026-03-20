import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Component as DesignLayoutCaptures } from './DesignLayoutCaptures';

vi.mock('@/components/common/useShellHeaderTitle', () => ({
  useShellHeaderTitle: vi.fn(),
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

const sampleCapture = {
  id: 'capture-1',
  name: 'Long Layout Capture Name',
  url: 'https://example.com/super/long/path/that/should/wrap/in/a/narrow/table/layout',
  viewport: '1440x1024',
  theme: 'light' as const,
  pageType: 'settings' as const,
  capturedAt: '2026-03-19T12:00:00.000Z',
  outputDir: 'captures/capture-1',
  status: 'complete' as const,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DesignLayoutCaptures responsiveness', () => {
  it('uses an image-only preview column while wrapping long URL content and action controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [sampleCapture],
      }),
    );

    const { container } = render(<DesignLayoutCaptures />);

    await screen.findByText(sampleCapture.url);

    const table = container.querySelector('table');
    const previewCell = container.querySelector('tbody tr td:nth-child(2)');
    const urlCell = container.querySelector('tbody tr td:nth-child(3)');
    const actionStack = container.querySelector('tbody tr td:last-child > div');

    expect(table?.className).toContain('table-fixed');
    expect(previewCell?.querySelector('img')).not.toBeNull();
    expect(previewCell?.textContent?.trim()).toBe('');
    expect(urlCell?.className).toContain('whitespace-normal');
    expect(urlCell?.className).toContain('break-all');
    expect(actionStack?.className).toContain('flex-wrap');
  });
});
