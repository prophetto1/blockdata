import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HeaderCenterProvider, useHeaderCenter } from '@/components/shell/HeaderCenterContext';
import { useShellHeaderTitle } from './useShellHeaderTitle';

function HeaderCenterReader() {
  const { center } = useHeaderCenter();
  return <div data-testid="header-center">{center}</div>;
}

function HeaderTitleProbe(props: {
  title?: React.ReactNode;
  breadcrumbs?: string[];
}) {
  useShellHeaderTitle(props);
  return null;
}

function renderHeaderAt(
  pathname: string,
  props: {
    title?: React.ReactNode;
    breadcrumbs?: string[];
  },
) {
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <HeaderCenterProvider>
        <HeaderTitleProbe {...props} />
        <HeaderCenterReader />
      </HeaderCenterProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
});

describe('useShellHeaderTitle classic breadcrumb resolution', () => {
  it('uses the classic top-level label for assets even when the page title differs', () => {
    renderHeaderAt('/app/assets', { title: 'Project Assets' });

    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.queryByText('Project Assets')).not.toBeInTheDocument();
  });

  it('uses the drill child label for ingest landing routes', () => {
    renderHeaderAt('/app/parse', { title: 'Parse Documents' });

    expect(screen.getByText('Ingest')).toBeInTheDocument();
    expect(screen.getByText('Parse')).toBeInTheDocument();
    expect(screen.queryByText('Parse Documents')).not.toBeInTheDocument();
  });

  it('uses the drill child label for ingest secondary routes', () => {
    renderHeaderAt('/app/load', { title: 'Load' });

    expect(screen.getByText('Ingest')).toBeInTheDocument();
    expect(screen.getByText('Load')).toBeInTheDocument();
  });

  it('uses the nav child label for static settings routes', () => {
    renderHeaderAt('/app/settings/profile', {
      title: 'Profile',
      breadcrumbs: ['Settings', 'Profile'],
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.queryByText('Profile')).not.toBeInTheDocument();
  });

  it('uses the nav child label for the canonical secrets settings route', () => {
    renderHeaderAt('/app/settings/secrets', {
      title: 'Secrets',
      breadcrumbs: ['Settings', 'Secrets'],
    });

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Secrets')).toBeInTheDocument();
    expect(screen.queryByText('Variables')).not.toBeInTheDocument();
  });

  it('uses the drill child label for connections routes', () => {
    renderHeaderAt('/app/marketplace/integrations', { title: 'Integrations' });

    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
  });

  it('uses the pipeline services parent label for knowledge bases', () => {
    renderHeaderAt('/app/pipeline-services/knowledge-bases', { title: 'Knowledge Bases' });

    expect(screen.getByText('Pipeline Services')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Bases')).toBeInTheDocument();
  });

  it('uses the drill child label for pipeline service routes', () => {
    renderHeaderAt('/app/pipeline-services/index-builder', { title: 'Index Builder Workspace' });

    expect(screen.getByText('Pipeline Services')).toBeInTheDocument();
    expect(screen.getByText('Index Builder')).toBeInTheDocument();
    expect(screen.queryByText('Index Builder Workspace')).not.toBeInTheDocument();
  });

  it('prefers explicit breadcrumbs over legacy flattened labels for pipeline services landing routes', () => {
    renderHeaderAt('/app/pipeline-services', {
      title: 'Pipeline Services',
      breadcrumbs: ['Pipeline Services'],
    });

    expect(screen.getByText('Pipeline Services')).toBeInTheDocument();
    expect(screen.queryByText('RAG')).not.toBeInTheDocument();
  });

  it('uses systematic classic flow detail breadcrumbs', () => {
    renderHeaderAt('/app/flows/default-flow/overview', {
      title: 'Default Flow',
      breadcrumbs: ['Flows', 'Default Flow', 'Overview'],
    });

    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.queryByText('Default Flow')).not.toBeInTheDocument();
  });

  it('uses the active flow tab label without entity names', () => {
    renderHeaderAt('/app/flows/default-flow/edit', {
      title: 'Default Flow',
      breadcrumbs: ['Flows', 'Default Flow', 'Edit'],
    });

    expect(screen.getByText('Flows')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('Default Flow')).not.toBeInTheDocument();
  });
});
