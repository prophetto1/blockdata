import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFullBleedLayout } from '@/components/layout/PublicFullBleedLayout';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthGuard } from '@/auth/AuthGuard';


import MarketingIntegrations from '@/pages/MarketingIntegrations';
import AuthCallback from '@/pages/AuthCallback';
import AuthWelcome from '@/pages/AuthWelcome';
import LoginSplit from '@/pages/LoginSplit';
import Projects from '@/pages/Projects';
import FlowDetail from '@/pages/FlowDetail';
import FlowsList from '@/pages/FlowsList';

import Schemas from '@/pages/Schemas';
import SchemaLayout from '@/pages/SchemaLayout';

import { SettingsLayout, SettingsAccount, SettingsAiOverview, SettingsProviderForm, SettingsModelRoles, SettingsGridSample, SettingsThemes } from '@/pages/settings';
import PlatformLanding from '@/pages/experiments/PlatformLanding';
import Landing from '@/pages/Landing';
import Agents from '@/pages/Agents';
import ModelRegistrationPreview from '@/pages/ModelRegistrationPreview';
import AgentOnboarding from '@/pages/AgentOnboarding';
import AgentOnboardingAuth from '@/pages/AgentOnboardingAuth';
import AgentOnboardingConnect from '@/pages/AgentOnboardingConnect';
import AgentOnboardingSelect from '@/pages/AgentOnboardingSelect';
import McpServers from '@/pages/settings/McpServers';
import ConnectionsPanel from '@/pages/settings/ConnectionsPanel';
import { ScalarApiPlaygroundPage } from '@/pages/settings/ScalarApiPlaygroundPage';
import Commands from '@/pages/Commands';

import DatabasePlaceholder from '@/pages/DatabasePlaceholder';
import ProjectAssetsPage from '@/pages/ProjectAssetsPage';
import ParsePage from '@/pages/ParsePage';
import { Component as Workspace } from '@/pages/Workspace';
import ExtractPage from '@/pages/ExtractPage';
import ConvertPage from '@/pages/ConvertPage';
import TransformPage from '@/pages/TransformPage';
import LoadPage from '@/pages/LoadPage';
import AppHome from '@/pages/AppHome';
import EarlyAccess from '@/pages/EarlyAccess';

import IntegrationsCatalog from '@/pages/marketplace/IntegrationsCatalog';
import ServicesCatalog from '@/pages/marketplace/ServicesCatalog';
import ServiceDetailPage from '@/pages/marketplace/ServiceDetailPage';
import FunctionCatalogPage from '@/pages/marketplace/FunctionCatalogPage';
import TestsPage from '@/pages/kestra/TestsPage';
import { FlowsRouteShell } from '@/components/layout/FlowsRouteShell';
import { featureFlags } from '@/lib/featureFlags';
import { SuperuserGuard } from '@/pages/superuser/SuperuserGuard';
import NotFound from '@/pages/NotFound';
import { StudioLayout } from '@/components/layout/StudioLayout';
import StudioHome from '@/pages/studio/StudioHome';
import { StudioSectionPlaceholder } from '@/pages/studio/StudioSectionPlaceholder';
import { styleTokens } from '@/lib/styleTokens';


function LegacyToTransform() {
  const { projectId } = useParams<{ projectId: string }>();
  const target = projectId ? `/app/transform` : '/app/transform';
  return <Navigate to={target} replace />;
}


function LegacySettingsAdminRedirect() {
  const { category } = useParams<{ category?: string }>();
  const targetByCategory: Record<string, string> = {
    'instance-config': '/app/superuser/instance-config',
    'worker-config': '/app/superuser/worker-config',
    audit: '/app/superuser/audit',
    'parsers-docling': '/app/superuser/parsers-docling',
    'platform-config': '/app/superuser/instance-config',
  };

  return <Navigate to={targetByCategory[category ?? ''] ?? '/app/superuser/instance-config'} replace />;
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
      { path: '/auth/welcome', element: <AuthWelcome /> },
    ],
  },

  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // App landing + projects
          { path: '/app', element: <AppHome /> },

          { path: '/app/projects/list', element: <Projects /> },
          { path: '/app/database', element: <DatabasePlaceholder /> },
          { path: '/app/assets', element: <ProjectAssetsPage /> },
          { path: '/app/parse', element: <ParsePage /> },
          { path: '/app/workspace', element: <Workspace /> },
          { path: '/app/extract', element: <ExtractPage /> },
          { path: '/app/convert', element: <ConvertPage /> },
          { path: '/app/tests', element: <TestsPage /> },
          { path: '/app/test-integrations', element: <Navigate to="/app/superuser/test-integrations" replace /> },
          { path: '/app/marketplace/integrations', element: <IntegrationsCatalog /> },
          { path: '/app/marketplace/services', element: <ServicesCatalog /> },
          { path: '/app/marketplace/services/:serviceId', element: <ServiceDetailPage /> },
          { path: '/app/marketplace/functions', element: <FunctionCatalogPage /> },
          {
            path: '/app/flows',
            element: <FlowsRouteShell />,
            children: [
              { index: true, element: <FlowsList /> },
              { path: ':flowId/:tab?', element: <FlowDetail /> },
            ],
          },

          { path: '/app/ui', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/ui/:section', element: <Navigate to="/app/schemas" replace /> },
          { path: '/app/transform', element: <TransformPage /> },
          { path: '/app/transform/:projectId', element: <LegacyToTransform /> },

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
          // API Editor (Scalar playground)
          { path: '/app/api-editor', element: <ScalarApiPlaygroundPage /> },

          // Load (GCS → ArangoDB wizard)
          { path: '/app/load', element: <LoadPage /> },

          // Settings (API keys, model defaults, MCP)
          {
            path: '/app/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/app/settings/profile" replace /> },
              { path: 'profile', element: <SettingsAccount /> },
              { path: 'themes', element: <SettingsThemes /> },
              { path: 'ai', element: <SettingsAiOverview /> },
              { path: 'ai/:providerId', element: <SettingsProviderForm /> },
              { path: 'model-roles', element: <SettingsModelRoles /> },
              { path: 'mcp', element: <McpServers /> },
              { path: 'connections', element: <ConnectionsPanel /> },
              { path: 'grid-sample', element: <SettingsGridSample /> },
              { path: 'admin', element: <Navigate to="/app/superuser/instance-config" replace /> },
              { path: 'admin/:category', element: <LegacySettingsAdminRedirect /> },
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

          // Superuser dashboard (gated by registry_superuser_profiles)
          {
            path: '/app/superuser',
            element: <SuperuserGuard />,
            children: [
              { index: true, lazy: () => import('@/pages/superuser/SuperuserWorkspace') },
              { path: 'parsers-docling', lazy: () => import('@/pages/settings/DoclingConfigPanel') },
              { path: 'document-views', lazy: () => import('@/pages/superuser/SuperuserDocumentViews') },
              { path: 'instance-config', lazy: () => import('@/pages/superuser/SuperuserInstanceConfig') },
              { path: 'worker-config', lazy: () => import('@/pages/superuser/SuperuserWorkerConfig') },
              { path: 'audit', lazy: () => import('@/pages/superuser/SuperuserAuditHistory') },
              { path: 'api-endpoints', lazy: () => import('@/pages/superuser/SuperuserApiEndpoints') },
              { path: 'test-integrations', lazy: () => import('@/pages/superuser/TestIntegrations') },
            ],
          },

          { path: '*', element: <NotFound /> },
        ],
      },
      // Data Studio shell — separate from AppLayout, no inherited header/rail
      {
        element: <StudioLayout />,
        children: [
          { path: '/app/studio',        element: <StudioHome /> },
          { path: '/app/studio/sql',    element: <StudioSectionPlaceholder section="SQL"    color={styleTokens.studio.colors.sql} /> },
          { path: '/app/studio/python', element: <StudioSectionPlaceholder section="Python" color={styleTokens.studio.colors.python} /> },
          { path: '/app/studio/visual', element: <StudioSectionPlaceholder section="Visual" color={styleTokens.studio.colors.visual} /> },
          { path: '/app/studio/data',   element: <StudioSectionPlaceholder section="Tables" color={styleTokens.studio.colors.data} /> },
          { path: '/app/studio/runs',   element: <StudioSectionPlaceholder section="Runs"   color={styleTokens.studio.colors.runs} /> },
          { path: '/app/studio/jobs',   element: <StudioSectionPlaceholder section="Jobs"   color={styleTokens.studio.colors.jobs} /> },
        ],
      },
    ],
  },
  // Catch-all 404 for routes outside /app
  { path: '*', element: <NotFound /> },
]);


