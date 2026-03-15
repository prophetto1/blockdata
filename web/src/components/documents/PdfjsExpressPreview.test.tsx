import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setThemeMock = vi.fn();
const setToolbarGroupMock = vi.fn();
const setFitModeMock = vi.fn();
const webViewerMock = vi.fn(async () => ({
  UI: {
    setTheme: setThemeMock,
    setToolbarGroup: setToolbarGroupMock,
    FitMode: { FitWidth: 'FIT_WIDTH' },
    setFitMode: setFitModeMock,
  },
}));

vi.mock('@pdftron/pdfjs-express', () => ({
  default: webViewerMock,
}));

import { PdfjsExpressPreview } from './PdfjsExpressPreview';

describe('PdfjsExpressPreview', () => {
  afterEach(() => {
    webViewerMock.mockClear();
    setThemeMock.mockClear();
    setToolbarGroupMock.mockClear();
    setFitModeMock.mockClear();
  });

  it('initializes the viewer in read-only view mode', async () => {
    render(<PdfjsExpressPreview url="https://example.test/report.pdf" />);

    await waitFor(() => {
      expect(webViewerMock).toHaveBeenCalledTimes(1);
    });

    expect(webViewerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/vendor/pdfjs-express',
        initialDoc: 'https://example.test/report.pdf',
        enableReadOnlyMode: true,
        disabledElements: ['ribbons'],
      }),
      expect.any(HTMLDivElement),
    );

    await waitFor(() => {
      expect(setThemeMock).toHaveBeenCalledWith('light');
      expect(setToolbarGroupMock).toHaveBeenCalledWith('toolbarGroup-View');
      expect(setFitModeMock).toHaveBeenCalledWith('FIT_WIDTH');
    });
  });
});
