import { StrictMode, useLayoutEffect, type ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

type MockUppyInstance = {
  use: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const dashboardUppyInstances: MockUppyInstance[] = [];
let hasCommitted = false;
let constructedBeforeCommit = false;

vi.mock('@uppy/core', () => {
  class MockUppy {
    constructor() {
      if (!hasCommitted) {
        constructedBeforeCommit = true;
      }
    }

    use = vi.fn().mockReturnThis();
    on = vi.fn().mockReturnThis();
    destroy = vi.fn();
  }

  return { default: MockUppy };
});

vi.mock('@uppy/react/dashboard', () => ({
  default: ({ uppy, showSelectedFiles }: { uppy: MockUppyInstance; showSelectedFiles?: boolean }) => {
    dashboardUppyInstances.push(uppy);
    return <div data-testid="uppy-dashboard" data-show-selected={String(Boolean(showSelectedFiles))}>dashboard</div>;
  },
}));

vi.mock('@uppy/react', () => ({
  UppyContextProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Dropzone: () => <div />,
  FilesList: () => <div />,
  UploadButton: () => <button type="button">Upload</button>,
}));

vi.mock('@uppy/remote-sources', () => ({
  default: class MockRemoteSources {},
}));

vi.mock('@uppy/xhr-upload', () => ({
  default: class MockXHRUpload {},
}));

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'test-access-token' },
  }),
}));

vi.mock('@/lib/edge', () => ({
  edgeJson: vi.fn().mockRejectedValue(new Error('upload-policy unavailable')),
}));

import { ProjectParseUppyUploader } from './ProjectParseUppyUploader';

function MountGuard({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    hasCommitted = true;
  }, []);
  return <>{children}</>;
}

describe('ProjectParseUppyUploader strict mode lifecycle', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    dashboardUppyInstances.length = 0;
    hasCommitted = false;
    constructedBeforeCommit = false;
  });

  it('constructs Uppy only after mount, not during render', async () => {
    render(
      <StrictMode>
        <MantineProvider>
          <MountGuard>
            <ProjectParseUppyUploader projectId="project-1" />
          </MountGuard>
        </MantineProvider>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('uppy-dashboard')).toBeInTheDocument();
    });

    expect(constructedBeforeCommit).toBe(false);
  });

  it('does not include apikey in Companion headers', async () => {
    render(
      <MantineProvider>
        <ProjectParseUppyUploader
          projectId="project-1"
          enableRemoteSources
          companionUrl="https://companion.example"
        />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('uppy-dashboard')).toBeInTheDocument();
    });

    const instance = dashboardUppyInstances.at(-1);
    expect(instance).toBeDefined();

    const remoteSourcesCall = instance?.use.mock.calls.find((call) => {
      const opts = call[1] as Record<string, unknown> | undefined;
      return opts?.companionCookiesRule === 'include';
    });

    expect(remoteSourcesCall).toBeDefined();
    const options = remoteSourcesCall?.[1] as {
      companionHeaders?: Record<string, string>;
      companionCookiesRule?: string;
      sources?: string[];
    };
    expect(options.companionCookiesRule).toBe('include');
    expect(options.companionHeaders).toEqual({
      Authorization: 'Bearer test-access-token',
    });
    expect(options.companionHeaders).not.toHaveProperty('apikey');
    expect(options.sources).toEqual(['GoogleDrive']);
    expect(screen.getByTestId('uppy-dashboard')).toHaveAttribute('data-show-selected', 'true');
  });

  it('disables remote sources when companion.uppy.io is configured', async () => {
    render(
      <MantineProvider>
        <ProjectParseUppyUploader
          projectId="project-1"
          enableRemoteSources
          companionUrl="https://companion.uppy.io"
        />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('uppy-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText(/companion\.uppy\.io is not the project companion service/i)).toBeInTheDocument();

    const instance = dashboardUppyInstances.at(-1);
    expect(instance).toBeDefined();

    const remoteSourcesCall = instance?.use.mock.calls.find((call) => {
      const opts = call[1] as Record<string, unknown> | undefined;
      return opts?.companionCookiesRule === 'include';
    });

    expect(remoteSourcesCall).toBeUndefined();
  });
});
