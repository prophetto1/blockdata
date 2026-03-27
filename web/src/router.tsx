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
import SecretsPage from '@/pages/SecretsPage';
import LoadPage from '@/pages/LoadPage';
import AppHome from '@/pages/AppHome';
import EarlyAccess from '@/pages/EarlyAccess';

import IntegrationsCatalog from '@/pages/marketplace/IntegrationsCatalog';
import ServicesCatalog from '@/pages/marketplace/ServicesCatalog';
import ServiceDetailPage from '@/pages/marketplace/ServiceDetailPage';
import FunctionCatalogPage from '@/pages/marketplace/FunctionCatalogPage';
import LogsPage from '@/pages/kestra/LogsPage';
import TestsPage from '@/pages/kestra/TestsPage';
import { FlowsShellLayout } from '@/components/layout/FlowsShellLayout';
import { featureFlags } from '@/lib/featureFlags';
import { SuperuserGuard } from '@/pages/superuser/SuperuserGuard';
import NotFound from '@/pages/NotFound';
import { AdminShellLayout } from '@/components/layout/AdminShellLayout';
import { AgchainShellLayout } from '@/components/layout/AgchainShellLayout';


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
          { path: '/app/secrets', element: <SecretsPage /> },
          { path: '/app/tests', element: <TestsPage /> },
          { path: '/app/logs', element: <LogsPage /> },
          { path: '/app/test-integrations', element: <Navigate to="/app/superuser/test-integrations" replace /> },
          { path: '/app/marketplace/integrations', element: <IntegrationsCatalog /> },
          { path: '/app/marketplace/services', element: <ServicesCatalog /> },
          { path: '/app/marketplace/services/:serviceId', element: <ServiceDetailPage /> },
          { path: '/app/marketplace/functions', element: <FunctionCatalogPage /> },
          { path: '/app/flows', element: <FlowsList /> },

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

          // Pipeline nav pages
          { path: '/app/knowledge-bases', lazy: () => import('@/pages/KnowledgeBases') },
          { path: '/app/skills', lazy: () => import('@/pages/Skills') },
          { path: '/app/mcp-tools', lazy: () => import('@/pages/McpTools') },
          { path: '/app/observability', element: <Navigate to="/app/observability/telemetry" replace /> },
          { path: '/app/observability/telemetry', lazy: () => import('@/pages/ObservabilityTelemetry') },
          { path: '/app/observability/traces', lazy: () => import('@/pages/ObservabilityTraces') },

          // Settings (API keys, model defaults, MCP)
          {
            path: '/app/settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="/app/settings/profile" replace /> },
              { path: 'profile', element: <SettingsAccount /> },
              { path: 'themes', element: <SettingsThemes /> },
              { path: 'ai', element: <Navigate to="/app/superuser/ai-providers" replace /> },
              { path: 'ai/:providerId', element: <Navigate to="/app/superuser/ai-providers" replace /> },
              { path: 'model-roles', element: <Navigate to="/app/superuser/model-roles" replace /> },
              { path: 'mcp', element: <Navigate to="/app/superuser/mcp" replace /> },
              { path: 'connections', element: <Navigate to="/app/superuser/connections" replace /> },
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
          // /app/mcp removed — MCP now lives at /app/superuser/mcp
          { path: '/app/mcp', element: <Navigate to="/app/superuser/mcp" replace /> },
          {
            path: '/app/commands',
            element: featureFlags.commandsUI ? <Commands /> : <Navigate to="/app/settings" replace />,
          },

          { path: '*', element: <NotFound /> },
        ],
      },
      // Admin shell — separate from AppLayout, no inherited header/rail
      {
        element: <FlowsShellLayout />,
        children: [
          {
            path: '/app/flows/:namespace/:flowId/:tab?',
            element: <FlowDetail />,
          },
        ],
      },
      {
        element: <AdminShellLayout />,
        children: [
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
              { path: 'design-layout-captures', lazy: () => import('@/pages/superuser/DesignLayoutCaptures') },
              { path: 'ai-providers', element: <SettingsAiOverview /> },
              { path: 'ai-providers/:providerId', element: <SettingsProviderForm /> },
              { path: 'model-roles', element: <SettingsModelRoles /> },
              { path: 'connections', element: <ConnectionsPanel /> },
              { path: 'mcp', element: <McpServers /> },
            ],
          },
        ],
      },
      {
        element: <AgchainShellLayout />,
        children: [
          {
            path: '/app/agchain',
            children: [
              {
                index: true,
                element: <Navigate to="/app/agchain/benchmarks" replace />,
              },
              {
                path: 'benchmarks',
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainBenchmarksPage')).default }),
                  },
                  {
                    path: ':benchmarkId',
                    lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainBenchmarkWorkbenchPage')).default }),
                  },
                ],
              },
              {
                path: 'models',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainModelsPage')).default }),
              },
              {
                path: 'runs',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainRunsPage')).default }),
              },
              {
                path: 'results',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainResultsPage')).default }),
              },
              {
                path: 'observability',
                lazy: async () => ({ Component: (await import('@/pages/agchain/AgchainObservabilityPage')).default }),
              },
              // Removed routes — redirect to nearest equivalent
              { path: 'build',     element: <Navigate to="/app/agchain/benchmarks" replace /> },
              { path: 'artifacts', element: <Navigate to="/app/agchain/observability" replace /> },
              { path: 'settings',  element: <Navigate to="/app/agchain/benchmarks" replace /> },
            ],
          },
        ],
      },
    ],
  },
  // Catch-all 404 for routes outside /app
  { path: '*', element: <NotFound /> },
]);


