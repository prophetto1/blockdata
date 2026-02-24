import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HeaderCenterProvider, useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import { useShellHeaderTitle } from './useShellHeaderTitle';

const {
  fromMock,
  selectMock,
  eqMock,
  maybeSingleMock,
} = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    fromMock: from,
    selectMock: select,
    eqMock: eq,
    maybeSingleMock: maybeSingle,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

function HeaderSetter({ title, subtitle }: { title: string; subtitle?: string }) {
  useShellHeaderTitle({ title, subtitle });
  return null;
}

function HeaderViewer() {
  const { center } = useHeaderCenter();
  return <div>{center}</div>;
}

describe('useShellHeaderTitle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    fromMock.mockClear();
    selectMock.mockClear();
    eqMock.mockClear();
    maybeSingleMock.mockReset();
  });

  it('renders project/menu subtitle and page title for app routes', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { project_name: 'Default Project' },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/app/projects/project-123/upload']}>
        <HeaderCenterProvider>
          <HeaderSetter title="Upload" subtitle="ignored" />
          <HeaderViewer />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Default Project/Documents')).toBeInTheDocument();
    });

    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(fromMock).toHaveBeenCalled();
    expect(selectMock).toHaveBeenCalledWith('project_name');
    expect(eqMock).toHaveBeenCalledWith('project_id', 'project-123');
  });

  it('falls back to focused project id when route has no project id', async () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'focused-project-id');
    maybeSingleMock.mockResolvedValue({
      data: { project_name: 'Default Project' },
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/app/flows']}>
        <HeaderCenterProvider>
          <HeaderSetter title="Flows" />
          <HeaderViewer />
        </HeaderCenterProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Default Project/Flows')).toBeInTheDocument();
    });

    expect(eqMock).toHaveBeenCalledWith('project_id', 'focused-project-id');
  });
});
