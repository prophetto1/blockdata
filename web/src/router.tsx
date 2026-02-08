import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';

import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Upload from '@/pages/Upload';
import Documents from '@/pages/Documents';
import DocumentDetail from '@/pages/DocumentDetail';
import Schemas from '@/pages/Schemas';
import RunsList from '@/pages/RunsList';
import RunDetail from '@/pages/RunDetail';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/login', element: <Login /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/app', element: <Dashboard /> },
          { path: '/app/upload', element: <Upload /> },
          { path: '/app/documents', element: <Documents /> },
          { path: '/app/documents/:sourceUid', element: <DocumentDetail /> },
          { path: '/app/schemas', element: <Schemas /> },
          { path: '/app/runs', element: <RunsList /> },
          { path: '/app/runs/:runId', element: <RunDetail /> },
        ],
      },
    ],
  },
]);
