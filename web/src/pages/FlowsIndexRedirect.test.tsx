import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { PROJECT_FOCUS_STORAGE_KEY } from '@/lib/projectFocus';
import FlowsIndexRedirect from './FlowsIndexRedirect';

describe('FlowsIndexRedirect', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('redirects to focused project flow overview', async () => {
    window.localStorage.setItem(PROJECT_FOCUS_STORAGE_KEY, 'project-123');

    const router = createMemoryRouter(
      [
        { path: '/app/flows', element: <FlowsIndexRedirect /> },
        { path: '/app/flows/:flowId/:tab', element: <div>flow detail page</div> },
        { path: '/app/projects', element: <div>projects home page</div> },
      ],
      { initialEntries: ['/app/flows'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('flow detail page')).toBeInTheDocument();
  });

  it('redirects to projects when no focused project exists', async () => {
    const router = createMemoryRouter(
      [
        { path: '/app/flows', element: <FlowsIndexRedirect /> },
        { path: '/app/flows/:flowId/:tab', element: <div>flow detail page</div> },
        { path: '/app/projects', element: <div>projects home page</div> },
      ],
      { initialEntries: ['/app/flows'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('projects home page')).toBeInTheDocument();
  });
});
