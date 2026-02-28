import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { LeftRailShadcn } from './LeftRailShadcn';

const rpcMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(),
      })),
    })),
  },
}));

describe('LeftRailShadcn project selector', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({
      data: [
        {
          project_id: 'default-project-id',
          project_name: 'Default Project',
          doc_count: 11,
          workspace_id: null,
        },
        {
          project_id: 'alpha-project-id',
          project_name: 'Alpha Project',
          doc_count: 2,
          workspace_id: null,
        },
      ],
      error: null,
    });
  });

  it('renders the project dropdown list inside Ark ScrollArea wrappers', async () => {
    render(
      <MemoryRouter initialEntries={['/app/elt/default-project-id']}>
        <LeftRailShadcn />
      </MemoryRouter>,
    );

    const trigger = await screen.findByRole('combobox', { name: 'Select project' });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.querySelector('[data-part="content"]')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="scroll-area"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="scroll-area-scrollbar"]')).toBeInTheDocument();
      expect(document.querySelector('[data-slot="scroll-area-thumb"]')).toBeInTheDocument();
    });
  });
});
