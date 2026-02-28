import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFullBleedLayout } from '@/components/layout/PublicFullBleedLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';
import { LegacyRunRedirect } from '@/components/common/LegacyRedirect';

import MarketingIntegrations from '@/pages/MarketingIntegrations';
import AuthCallback from '@/pages/AuthCallback';
import Projects from '@/pages/Projects';
import FlowDetail from '@/pages/FlowDetail';
import FlowsList from '@/pages/FlowsList';
import Editor from '@/pages/Editor';
import Integrations from '@/pages/Integrations';
import UppyLibraryDemo from '@/pages/UppyLibraryDemo';
import Schemas from '@/pages/Schemas';
import SchemaLayout from '@/pages/SchemaLayout';
import RunDetail from '@/pages/RunDetail';
import { SettingsLayout, SettingsAccount, SettingsAiOverview, SettingsProviderForm, SettingsAdmin } from '@/pages/settings';
import LoginSplit from '@/pages/LoginSplit';
import PlatformLanding from '@/pages/experiments/PlatformLanding';
import Landing from '@/pages/Landing';
import Agents from '@/pages/Agents';
import ModelRegistrationPreview from '@/pages/ModelRegistrationPreview';
import AgentOnboarding from '@/pages/AgentOnboarding';
import AgentOnboardingAuth from '@/pages/AgentOnboardingAuth';
import AgentOnboardingConnect from '@/pages/AgentOnboardingConnect';
import AgentOnboardingSelect from '@/pages/AgentOnboardingSelect';
import McpServers from '@/pages/settings/McpServers';
import Commands from '@/pages/Commands';
import DocumentTest from '@/pages/DocumentTest';
import DatabasePlaceholder from '@/pages/DatabasePlaceholder';
import EarlyAccess from '@/pages/EarlyAccess';
import { FlowsRouteShell } from '@/components/layout/FlowsRouteShell';
import { featureFlags } from '@/lib/featureFlags';

function LegacyToElt() {
  return <Navigate to="/app/elt" replace />;
}

function LegacyToEltProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const target = projectId ? `/app/elt/${projectId}` : '/app/elt';
  return <Navigate to={target} replace />;
}

function LegacyToEltProjectRun() {
  const { projectId, runId } = useParams<{ projectId: string; runId: string }>();
  if (!projectId || !runId) return <Navigate to="/app/elt" replace />;
  return <Navigate to={`/app/elt/${projectId}/runs/${runId}`} replace />;
}

function LegacyToEltProjectUppyDemo() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return <Navigate to="/app/elt" replace />;
  return <Navigate to={`/app/elt/${projectId}/upload-uppy-demo`} replace />;
}


export const router = createBrowserRouter([
  // Marketing pages: full-width with PublicNav
  {
    element: <MarketingLayout />,
    children: [
      { path: '/integrations', element: <MarketingIntegrations /> },
      { path: '/experiments/platform', element: <PlatformLanding /> },
    ],
  },
  // Landing: marketing layout with nav + footer
  {
    element: <MarketingLayout />,
    children: [
      { path: '/', element: <Landing /> },
    ],
  },
  // Auth pages: full-bleed (use the split concepts)
  {
    element: <PublicFullBleedLayout />,
    children: [
      { path: '/login', element: <LoginSplit /> },
      { path: '/register', element: <Navigate to="/early-access" replace /> },
      { path: '/early-access', element: <EarlyAccess /> },
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
          { path: '/app', element: <Navigate to="/app/elt" replace /> },
          { path: '/app/elt', element: <DocumentTest /> },
          { path: '/app/elt/:projectId', element: <DocumentTest /> },
          { path: '/app/elt/:projectId/upload-uppy-demo', element: <UppyLibraryDemo /> },
          { path: '/app/elt/:projectId/runs/:runId', element: <RunDetail /> },
          { path: '/app/projects/list', element: <Projects /> },
          { path: '/app/database', element: <DatabasePlaceholder /> },
          { path: '/app/editor', element: <Editor /> },
          { path: '/app/integrations', element: <Integrations /> },
          {
            path: '/app/flows',
            element: <FlowsRouteShell />,
            children: [
              { index: true, element: <FlowsList /> },
              { path: ':flowId/:tab?', element: <FlowDetail /> },
            ],
          },

          // Project-scoped routes
          { path: '/app/projects', element: <LegacyToElt /> },
          { path: '/app/projects/:projectId', element: <LegacyToEltProject /> },
          { path: '/app/projects/:projectId/upload', element: <LegacyToEltProject /> },
          { path: '/app/ui', element: <Navigate to="/app/editor" replace /> },
          { path: '/app/ui/:section', element: <Navigate to="/app/editor" replace /> },
          { path: '/app/projects/:projectId/upload-uppy-demo', element: <LegacyToEltProjectUppyDemo /> },
          { path: '/app/projects/:projectId/runs/:runId', element: <LegacyToEltProjectRun /> },
          { path: '/app/extract', element: <LegacyToElt /> },
          { path: '/app/extract/:projectId', element: <LegacyToEltProject /> },
          { path: '/app/transform', element: <LegacyToElt /> },
          { path: '/app/transform/:projectId', element: <LegacyToEltProject /> },
          { path: '/app/upload', element: <LegacyToElt /> },
          { path: '/app/documents', element: <LegacyToElt /> },

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

          // Settings (API keys, model defaults, MCP, admin)
          {
            path: '/app/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/app/settings/profile" replace /> },
              { path: 'profile', element: <SettingsAccount /> },
              { path: 'ai', element: <SettingsAiOverview /> },
              { path: 'ai/:providerId', element: <SettingsProviderForm /> },
              { path: 'mcp', element: <McpServers /> },
              { path: 'admin', element: <Navigate to="/app/settings/admin/models" replace /> },
              { path: 'admin/:category', element: <SettingsAdmin /> },
            ],
          },

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
          // /app/mcp removed — MCP now lives at /app/settings/mcp
          { path: '/app/mcp', element: <Navigate to="/app/settings/mcp" replace /> },
          {
            path: '/app/commands',
            element: featureFlags.commandsUI ? <Commands /> : <Navigate to="/app/settings" replace />,
          },

          // Legacy flat routes → redirect to project-scoped equivalents
          { path: '/app/test', element: <LegacyToElt /> },
          { path: '/app/test/:projectId', element: <LegacyToEltProject /> },
          { path: '/app/runs/:runId', element: <LegacyRunRedirect /> },
        ],
      },
    ],
  },
]);
