import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFullBleedLayout } from '@/components/layout/PublicFullBleedLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';
import { LegacyRunRedirect } from '@/components/common/LegacyRedirect';

import Landing from '@/pages/Landing';
import HowItWorks from '@/pages/HowItWorks';
import UseCases from '@/pages/UseCases';
import MarketingIntegrations from '@/pages/MarketingIntegrations';
import AuthCallback from '@/pages/AuthCallback';
import ProjectsHome from '@/pages/ProjectsHome';
import Projects from '@/pages/Projects';
import FlowDetail from '@/pages/FlowDetail';
import FlowsIndexRedirect from '@/pages/FlowsIndexRedirect';
import ProjectDetail from '@/pages/ProjectDetail';
import Upload from '@/pages/Upload';
import UiCatalog from '@/pages/UiCatalog';
import UppyLibraryDemo from '@/pages/UppyLibraryDemo';
import Extract from '@/pages/Extract';
import Transform from '@/pages/Transform';
import Schemas from '@/pages/Schemas';
import SchemaLayout from '@/pages/SchemaLayout';
import RunDetail from '@/pages/RunDetail';
import Settings from '@/pages/Settings';
import SuperuserSettings from '@/pages/SuperuserSettings';
import LoginSplit from '@/pages/LoginSplit';
import RegisterSplit from '@/pages/RegisterSplit';
import PlatformLanding from '@/pages/experiments/PlatformLanding';
import Agents from '@/pages/Agents';
import ModelRegistrationPreview from '@/pages/ModelRegistrationPreview';
import AgentOnboarding from '@/pages/AgentOnboarding';
import AgentOnboardingAuth from '@/pages/AgentOnboardingAuth';
import AgentOnboardingConnect from '@/pages/AgentOnboardingConnect';
import AgentOnboardingSelect from '@/pages/AgentOnboardingSelect';
import McpServers from '@/pages/McpServers';
import Commands from '@/pages/Commands';
import DatabasePlaceholder from '@/pages/DatabasePlaceholder';
import { FlowsRouteShell } from '@/components/layout/FlowsRouteShell';
import { featureFlags } from '@/lib/featureFlags';


export const router = createBrowserRouter([
  // Marketing pages: full-width with PublicNav
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/how-it-works', element: <HowItWorks /> },
      { path: '/use-cases', element: <UseCases /> },
      { path: '/integrations', element: <MarketingIntegrations /> },
      { path: '/experiments/platform', element: <PlatformLanding /> },
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
          // App landing + projects
          { path: '/app', element: <Navigate to="/app/projects" replace /> },
          { path: '/app/projects', element: <ProjectsHome /> },
          { path: '/app/projects/list', element: <Projects /> },
          { path: '/app/database', element: <DatabasePlaceholder /> },
          {
            path: '/app/flows',
            element: <FlowsRouteShell />,
            children: [
              { index: true, element: <FlowsIndexRedirect /> },
              { path: ':flowId/:tab?', element: <FlowDetail /> },
            ],
          },

          // Project-scoped routes
          { path: '/app/projects/:projectId', element: <ProjectDetail /> },
          { path: '/app/projects/:projectId/upload', element: <Upload /> },
          { path: '/app/ui', element: <UiCatalog /> },
          { path: '/app/ui/:section', element: <UiCatalog /> },
          { path: '/app/projects/:projectId/upload-uppy-demo', element: <UppyLibraryDemo /> },
          { path: '/app/projects/:projectId/runs/:runId', element: <RunDetail /> },
          { path: '/app/extract', element: <Navigate to="/app/projects" replace /> },
          { path: '/app/extract/:projectId', element: <Extract /> },
          { path: '/app/transform', element: <Navigate to="/app/projects" replace /> },
          { path: '/app/transform/:projectId', element: <Transform /> },

          // Global schemas (not project-scoped)
          { path: '/app/schemas', element: <Schemas /> },
          { path: '/app/schemas/layout', element: <SchemaLayout /> },
          { path: '/app/schemas/start', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/wizard', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/templates', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/templates/:templateId', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/apply', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/advanced', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/schemas/advanced/:schemaId', element: <Navigate to="/app/schemas" replace /> },

          // Settings (API keys, model defaults)
          { path: '/app/settings', element: <Settings /> },
          { path: '/app/settings/superuser', element: <SuperuserSettings /> },

          // Agents + MCP (config surfaces; execution deferred)
          {
            path: '/app/agents',
            element: featureFlags.agentsConfigUI ? <Agents /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/agents/preview',
            element: <ModelRegistrationPreview />,
          },
          {
            path: '/app/onboarding/agents',
            element: featureFlags.agentsConfigUI ? <AgentOnboarding /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/select',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingSelect /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/auth/:agentSlug',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingAuth /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/onboarding/agents/connect/:agentSlug/:authMethod',
            element: featureFlags.agentsConfigUI ? <AgentOnboardingConnect /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/mcp',
            element: featureFlags.mcpPlaceholderUI ? <McpServers /> : <Navigate to="/app/settings" replace />,
          },
          {
            path: '/app/commands',
            element: featureFlags.commandsUI ? <Commands /> : <Navigate to="/app/settings" replace />,
          },

          // Legacy flat routes → redirect to project-scoped equivalents
          { path: '/app/runs/:runId', element: <LegacyRunRedirect /> },
          { path: '/app/upload', element: <Navigate to="/app/projects" replace /> },
        ],
      },
    ],
  },
]);
