import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import AuthCallback from '@/pages/AuthCallback';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Upload from '@/pages/Upload';
import DocumentDetail from '@/pages/DocumentDetail';
import Schemas from '@/pages/Schemas';
import RunDetail from '@/pages/RunDetail';

export const router = createBrowserRouter([
  // Landing page has its own full-width layout (hero, sections, footer)
  { path: '/', element: <Landing /> },
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      { path: '/auth/callback', element: <AuthCallback /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Projects list (replaces old Dashboard)
          { path: '/app', element: <Projects /> },

          // Project-scoped routes
          { path: '/app/projects/:projectId', element: <ProjectDetail /> },
          { path: '/app/projects/:projectId/upload', element: <Upload /> },
          { path: '/app/projects/:projectId/documents/:sourceUid', element: <DocumentDetail /> },
          { path: '/app/projects/:projectId/runs/:runId', element: <RunDetail /> },

          // Global schemas (not project-scoped)
          { path: '/app/schemas', element: <Schemas /> },
        ],
      },
    ],
  },
]);
