import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const integrationCatalogPanelSpy = vi.fn();

vi.mock('./IntegrationCatalogPanel', () => ({
  IntegrationCatalogPanel: (props: unknown) => {
    integrationCatalogPanelSpy(props);
    return null;
  },
}));

import { IntegrationCatalogPanelTemp } from './IntegrationCatalogPanelTemp';

describe('IntegrationCatalogPanelTemp', () => {
  beforeEach(() => {
    integrationCatalogPanelSpy.mockClear();
  });

  it('renders IntegrationCatalogPanel with temp source and react-data-grid layout', () => {
    render(<IntegrationCatalogPanelTemp />);

    expect(integrationCatalogPanelSpy).toHaveBeenCalledTimes(1);
    expect(integrationCatalogPanelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'temp',
        layout: 'react-data-grid',
      }),
    );
  });
});
