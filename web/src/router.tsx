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
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Upload from '@/pages/Upload';
import DocumentDetail from '@/pages/DocumentDetail';
import Schemas from '@/pages/Schemas';
import RunDetail from '@/pages/RunDetail';
import LoginSplit from '@/pages/concepts/LoginSplit';
import LoginMinimal from '@/pages/concepts/LoginMinimal';
import RegisterSplit from '@/pages/concepts/RegisterSplit';
import LandingModern from '@/pages/concepts/LandingModern';
import LandingV2 from '@/pages/concepts/LandingV2';
import HowItWorksV2 from '@/pages/concepts/HowItWorksV2';
import UseCasesV2 from '@/pages/concepts/UseCasesV2';
import IntegrationsV2 from '@/pages/concepts/IntegrationsV2';
import HowItWorksModern from '@/pages/concepts/HowItWorksModern';
import UseCasesModern from '@/pages/concepts/UseCasesModern';
import IntegrationsModern from '@/pages/concepts/IntegrationsModern';

export const router = createBrowserRouter([
  // Marketing pages: full-width with PublicNav
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/how-it-works', element: <HowItWorks /> },
      { path: '/use-cases', element: <UseCases /> },
      { path: '/integrations', element: <MarketingIntegrations /> },
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
  
  // Concept previews (Standalone, no layout wrapper)
  { path: '/concepts/login-split', element: <LoginSplit /> },
  { path: '/concepts/login-minimal', element: <LoginMinimal /> },
  { path: '/concepts/register-split', element: <RegisterSplit /> },
  { path: '/concepts/landing-modern', element: <LandingModern /> },
  { path: '/concepts/landing-v2', element: <LandingV2 /> },
  { path: '/concepts/how-it-works-v2', element: <HowItWorksV2 /> },
  { path: '/concepts/use-cases-v2', element: <UseCasesV2 /> },
  { path: '/concepts/integrations-v2', element: <IntegrationsV2 /> },
  { path: '/concepts/how-it-works-modern', element: <HowItWorksModern /> },
  { path: '/concepts/use-cases-modern', element: <UseCasesModern /> },
  { path: '/concepts/integrations-modern', element: <IntegrationsModern /> },

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

          // Legacy flat routes → redirect to project-scoped equivalents
          { path: '/app/documents/:sourceUid', element: <LegacyDocumentRedirect /> },
          { path: '/app/runs/:runId', element: <LegacyRunRedirect /> },
          { path: '/app/upload', element: <Navigate to="/app" replace /> },
        ],
      },
    ],
  },
]);
