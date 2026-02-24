import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from '@/shell/Layout'
import HomePage from '@/pages/Home'
import ProjectsPage from '@/pages/Projects'
import TriggersPage from '@/pages/Triggers'
import RunsPage from '@/pages/Runs'
import MonitoringPage from '@/pages/Monitoring'
import CanvasPage from '@/pages/Canvas'
import NewPipelinePage from '@/pages/NewPipeline'
import DeployPage from '@/pages/Deploy'
import SchemasPage from '@/pages/Schemas'
import DataProductsPage from '@/pages/DataProducts'
import EditorPage from '@/pages/Editor'
import VersionControlPage from '@/pages/VersionControl'
import TerminalPage from '@/pages/TerminalPage'
import LoginPage from '@/pages/Login'
import AdminRegistryMapPage from '@/pages/admin/RegistryMap'
import AdminExecutorsPage from '@/pages/admin/Executors'
import AdminCIGatesPage from '@/pages/admin/CIGates'
import AdminProgressPage from '@/pages/admin/Progress'
import AdminProtectedFilesPage from '@/pages/admin/ProtectedFiles'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'pipelines', element: <ProjectsPage /> },
      { path: 'triggers', element: <TriggersPage /> },
      { path: 'pipeline-runs', element: <RunsPage /> },
      { path: 'overview', element: <MonitoringPage /> },
      { path: 'apps/pipelines/graph', element: <CanvasPage /> },
      { path: 'apps/pipelines/templates', element: <NewPipelinePage /> },
      { path: 'apps/deploy', element: <DeployPage /> },
      { path: 'apps/templates', element: <SchemasPage /> },
      { path: 'apps/products/data', element: <DataProductsPage /> },
      { path: 'apps/coder', element: <EditorPage /> },
      { path: 'apps/version-control/terminal', element: <VersionControlPage /> },
      { path: 'apps/terminal', element: <TerminalPage /> },
      { path: 'admin/registry', element: <AdminRegistryMapPage /> },
      { path: 'admin/executors', element: <AdminExecutorsPage /> },
      { path: 'admin/gates', element: <AdminCIGatesPage /> },
      { path: 'admin/progress', element: <AdminProgressPage /> },
      { path: 'admin/protected-files', element: <AdminProtectedFilesPage /> },
      { path: 'admin', element: <Navigate to="/admin/registry" replace /> },
      { path: 'runs', element: <Navigate to="/pipeline-runs" replace /> },
      { path: 'monitoring', element: <Navigate to="/overview" replace /> },
      { path: 'pipeline-graph', element: <Navigate to="/apps/pipelines/graph" replace /> },
      { path: 'deploy', element: <Navigate to="/apps/deploy" replace /> },
      { path: 'templates', element: <Navigate to="/apps/templates" replace /> },
      { path: 'data-products', element: <Navigate to="/apps/products/data" replace /> },
      { path: 'editor', element: <Navigate to="/apps/coder" replace /> },
      { path: 'version-control', element: <Navigate to="/apps/version-control/terminal" replace /> },
      { path: 'terminal', element: <Navigate to="/apps/terminal" replace /> },
      { path: 'admin-registry', element: <Navigate to="/admin/registry" replace /> },
      { path: 'admin-executors', element: <Navigate to="/admin/executors" replace /> },
      { path: 'admin-gates', element: <Navigate to="/admin/gates" replace /> },
      { path: 'admin-progress', element: <Navigate to="/admin/progress" replace /> },
      { path: 'admin-protected-files', element: <Navigate to="/admin/protected-files" replace /> },
    ],
  },
  { path: 'login', element: <LoginPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
