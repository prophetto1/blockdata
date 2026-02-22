import { StrictMode, useLayoutEffect, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  default: ({ uppy }: { uppy: MockUppyInstance }) => {
    dashboardUppyInstances.push(uppy);
    return <div data-testid="uppy-dashboard">dashboard</div>;
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
});
