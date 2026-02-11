import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFullBleedLayout } from '@/components/layout/PublicFullBleedLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';
import { LegacyDocumentRedirect, LegacyRunRedirect } from '@/components/common/LegacyRedirect';

import Landing from '@/pages/Landing';
import HowItWorks from '@/pages/HowItWorks';
import UseCases from '@/pages/UseCases';
import MarketingIntegrations from '@/pages/MarketingIntegrations';
import AuthCallback from '@/pages/AuthCallback';
import WorkspaceHome from '@/pages/WorkspaceHome';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Upload from '@/pages/Upload';
import DocumentDetail from '@/pages/DocumentDetail';
import Schemas from '@/pages/Schemas';
import SchemaAdvancedEditor from '@/pages/SchemaAdvancedEditor';
import RunDetail from '@/pages/RunDetail';
import Settings from '@/pages/Settings';
import LoginSplit from '@/pages/LoginSplit';
import RegisterSplit from '@/pages/RegisterSplit';


export const router = createBrowserRouter([
  // Marketing pages: full-width with PublicNav
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/how-it-works', element: <HowItWorks /> },
      { path: '/use-cases', element: <UseCases withNav={false} /> },
      { path: '/integrations', element: <MarketingIntegrations withNav={false} /> },
    ],
  },
  // Auth pages: full-bleed (use the split concepts)
  {
    element: <PublicFullBleedLayout />,
    children: [
      { path: '/login', element: <LoginSplit /> },
      { path: '/register', element: <RegisterSplit /> },
    ],
  },
  // Auth callback: PublicNav + centered content
  {
    element: <PublicLayout />,
    children: [
      { path: '/auth/callback', element: <AuthCallback /> },
    ],
  },
  
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Workspace home + projects
          { path: '/app', element: <WorkspaceHome /> },
          { path: '/app/projects', element: <Projects /> },

          // Project-scoped routes
          { path: '/app/projects/:projectId', element: <ProjectDetail /> },
          { path: '/app/projects/:projectId/upload', element: <Upload /> },
          { path: '/app/projects/:projectId/documents/:sourceUid', element: <DocumentDetail /> },
          { path: '/app/projects/:projectId/runs/:runId', element: <RunDetail /> },

          // Global schemas (not project-scoped)
          { path: '/app/schemas', element: <Schemas /> },
          { path: '/app/schemas/advanced', element: <SchemaAdvancedEditor /> },
          { path: '/app/schemas/advanced/:schemaId', element: <SchemaAdvancedEditor /> },

          // Settings (API keys, model defaults)
          { path: '/app/settings', element: <Settings /> },

          // Legacy flat routes → redirect to project-scoped equivalents
          { path: '/app/documents/:sourceUid', element: <LegacyDocumentRedirect /> },
          { path: '/app/runs/:runId', element: <LegacyRunRedirect /> },
          { path: '/app/upload', element: <Navigate to="/app/projects" replace /> },
        ],
      },
    ],
  },
]);
