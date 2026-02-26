import { StrictMode, useLayoutEffect, type ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let hasCommitted = false;
let constructedBeforeCommit = false;

vi.mock('@uppy/core', () => {
  class MockUppy {
    constructor() {
      if (!hasCommitted) constructedBeforeCommit = true;
    }
    use = vi.fn().mockReturnThis();
    on = vi.fn().mockReturnThis();
    off = vi.fn().mockReturnThis();
    addFile = vi.fn();
    removeFile = vi.fn();
    upload = vi.fn();
    cancelAll = vi.fn();
    getFiles = vi.fn().mockReturnValue([]);
    destroy = vi.fn();
  }
  return { default: MockUppy };
});

vi.mock('@uppy/xhr-upload', () => ({ default: class {} }));
vi.mock('@uppy/remote-sources', () => ({ default: class {} }));
vi.mock('@uppy/react/dashboard', () => ({
  default: () => <div data-testid="uppy-dashboard">dashboard</div>,
}));
vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 'test-access-token' } }),
}));
vi.mock('@/lib/edge', () => ({
  edgeJson: vi.fn().mockRejectedValue(new Error('unavailable')),
}));

import { ProjectParseUppyUploader } from './ProjectParseUppyUploader';

function MountGuard({ children }: { children: ReactNode }) {
  useLayoutEffect(() => { hasCommitted = true; }, []);
  return <>{children}</>;
}

describe('ProjectParseUppyUploader strict mode lifecycle', () => {
  afterEach(() => { cleanup(); });
  beforeEach(() => { hasCommitted = false; constructedBeforeCommit = false; });

  it('renders the Ark UI dropzone', async () => {
    render(
      <StrictMode>
        <MountGuard>
          <ProjectParseUppyUploader projectId="project-1" />
        </MountGuard>
      </StrictMode>,
    );
    await waitFor(() => {
      expect(screen.getByText(/drag files here/i)).toBeInTheDocument();
    });
  });

  it('constructs Uppy only after mount, not during render', async () => {
    render(
      <StrictMode>
        <MountGuard>
          <ProjectParseUppyUploader projectId="project-1" />
        </MountGuard>
      </StrictMode>,
    );
    await waitFor(() => {
      expect(screen.getByText(/drag files here/i)).toBeInTheDocument();
    });
    expect(constructedBeforeCommit).toBe(false);
  });

  it('shows cloud import button when remote sources are enabled with valid companion', async () => {
    render(
      <ProjectParseUppyUploader
        projectId="project-1"
        enableRemoteSources
        companionUrl="https://companion.example"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/import from cloud/i)).toBeInTheDocument();
    });
  });

  it('does not show cloud import button when companion URL is blocked', async () => {
    render(
      <ProjectParseUppyUploader
        projectId="project-1"
        enableRemoteSources
        companionUrl="https://companion.uppy.io"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/drag files here/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/import from cloud/i)).not.toBeInTheDocument();
    expect(screen.getByText(/companion\.uppy\.io is not the project companion service/i)).toBeInTheDocument();
  });
});
