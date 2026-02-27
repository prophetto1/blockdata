import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider, useParams } from 'react-router-dom';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import FlowsIndexRedirect from './FlowsIndexRedirect';

function FlowDetailProbe() {
  const { tab } = useParams<{ tab: string }>();
  return <div>flow detail page ({tab})</div>;
}

describe('FlowsIndexRedirect', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects to focused project flow overview', async () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'project-123');

    const router = createMemoryRouter(
      [
        { path: '/app/flows', element: <FlowsIndexRedirect /> },
        { path: '/app/flows/:flowId/:tab', element: <FlowDetailProbe /> },
        { path: '/app/projects', element: <div>projects home page</div> },
      ],
      { initialEntries: ['/app/flows'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('flow detail page (overview)')).toBeInTheDocument();
  });

  it('redirects to focused project using remembered default flow tab', async () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'project-123');
    window.localStorage.setItem('flowDefaultTab', 'edit');

    const router = createMemoryRouter(
      [
        { path: '/app/flows', element: <FlowsIndexRedirect /> },
        { path: '/app/flows/:flowId/:tab', element: <FlowDetailProbe /> },
        { path: '/app/projects', element: <div>projects home page</div> },
      ],
      { initialEntries: ['/app/flows'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('flow detail page (edit)')).toBeInTheDocument();
  });

  it('ignores locked audit logs as remembered default tab and falls back to overview', async () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'project-123');
    window.localStorage.setItem('flowDefaultTab', 'auditlogs');

    const router = createMemoryRouter(
      [
        { path: '/app/flows', element: <FlowsIndexRedirect /> },
        { path: '/app/flows/:flowId/:tab', element: <FlowDetailProbe /> },
        { path: '/app/projects', element: <div>projects home page</div> },
      ],
      { initialEntries: ['/app/flows'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('flow detail page (overview)')).toBeInTheDocument();
  });

  it('redirects to projects when no focused project exists', async () => {
    const router = createMemoryRouter(
      [
        { path: '/app/flows', element: <FlowsIndexRedirect /> },
        { path: '/app/flows/:flowId/:tab', element: <FlowDetailProbe /> },
        { path: '/app/projects', element: <div>projects home page</div> },
      ],
      { initialEntries: ['/app/flows'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('projects home page')).toBeInTheDocument();
  });
});
