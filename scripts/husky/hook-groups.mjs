const HOOK_FAMILY_DEFINITIONS = [
  {
    id: 'repo-metadata-cleanup',
    patterns: ['**'],
    stages: {
      'pre-commit': {
        alwaysRun: true,
        commands: ['node tools/repo-hygiene/remove-desktop-ini.mjs --write --staged'],
      },
      'post-checkout': {
        alwaysRun: true,
        commands: ['node tools/repo-hygiene/remove-desktop-ini.mjs --write'],
      },
      'post-merge': {
        alwaysRun: true,
        commands: ['node tools/repo-hygiene/remove-desktop-ini.mjs --write'],
      },
      'post-rewrite': {
        alwaysRun: true,
        commands: ['node tools/repo-hygiene/remove-desktop-ini.mjs --write'],
      },
    },
  },
  {
    id: 'hardcoded-paths',
    patterns: ['**'],
    stages: {
      'pre-commit': {
        watchPatterns: ['**'],
        commands: ['node scripts/husky/check-hardcoded-paths.mjs --staged'],
      },
    },
  },
  {
    id: 'secret-scan',
    patterns: ['**'],
    stages: {
      'pre-commit': {
        watchPatterns: ['**'],
        commands: ['node scripts/husky/check-secrets.mjs --staged'],
      },
    },
  },
  {
    id: 'frontend-build-safety',
    patterns: ['web/**'],
    stages: {
      'pre-commit': {
        watchPatterns: ['web/**'],
        commands: ['cd web && npx eslint {changedWebFiles}'],
      },
      'pre-push': {
        watchPatterns: ['web/**'],
        commands: ['cd web && npx tsc -b --noEmit'],
      },
    },
  },
  {
    id: 'protected-push',
    patterns: ['**'],
    stages: {
      'pre-push': {
        alwaysRun: true,
        commands: ['node scripts/husky/check-protected-push.mjs'],
      },
    },
  },
  {
    id: 'supabase-workflow-guardrails',
    patterns: [
      'supabase/migrations/**',
      'supabase/seed.sql',
      'supabase/config.toml',
      '.github/workflows/supabase-db-validate.yml',
      '.github/workflows/supabase-db-deploy.yml',
      '.github/workflows/migration-history-hygiene.yml',
      'scripts/tests/supabase-db-workflows.test.mjs',
      'scripts/tests/supabase-extension-replay-guardrails.test.mjs',
      'scripts/tests/supabase-migration-reconciliation-contract.test.mjs',
      'package.json',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'supabase/migrations/**',
          'supabase/seed.sql',
          'supabase/config.toml',
          '.github/workflows/supabase-db-validate.yml',
          '.github/workflows/supabase-db-deploy.yml',
          '.github/workflows/migration-history-hygiene.yml',
          'scripts/tests/supabase-db-workflows.test.mjs',
          'scripts/tests/supabase-extension-replay-guardrails.test.mjs',
          'scripts/tests/supabase-migration-reconciliation-contract.test.mjs',
          'package.json',
        ],
        commands: [
          'npm run test:workflow-guardrails',
          'npm run test:supabase-extension-replay-guardrails',
          'npm run test:supabase-migration-reconciliation-contract',
        ],
      },
    },
  },
  {
    id: 'superuser-operational-readiness',
    patterns: [
      'services/platform-api/app/api/routes/admin_runtime_readiness.py',
      'services/platform-api/app/services/runtime_readiness.py',
      'services/platform-api/app/observability/runtime_readiness_metrics.py',
      'web/src/lib/operationalReadiness.ts',
      'web/src/hooks/useOperationalReadiness.ts',
      'web/src/components/superuser/OperationalReadinessCheckGrid.tsx',
      'web/src/pages/superuser/SuperuserOperationalReadiness.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'services/platform-api/app/api/routes/admin_runtime_readiness.py',
          'services/platform-api/app/services/runtime_readiness.py',
          'services/platform-api/app/observability/runtime_readiness_metrics.py',
          'web/src/lib/operationalReadiness.ts',
          'web/src/hooks/useOperationalReadiness.ts',
          'web/src/components/superuser/OperationalReadinessCheckGrid.tsx',
          'web/src/pages/superuser/SuperuserOperationalReadiness.tsx',
        ],
        commands: [
          'cd services/platform-api && pytest -q tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py',
          'cd web && npm run test -- src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/hooks/useOperationalReadiness.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx',
        ],
      },
    },
  },
  {
    id: 'blockdata-browser-upload',
    patterns: [
      'ops/gcs/user-storage-cors.json',
      'services/platform-api/app/services/runtime_action_service.py',
      'services/platform-api/app/api/routes/storage.py',
      'services/platform-api/app/services/runtime_readiness.py',
      'web/src/lib/storageUploadService.ts',
      'web/src/components/superuser/OperationalReadinessCheckGrid.tsx',
      'web/src/pages/superuser/SuperuserOperationalReadiness.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'ops/gcs/user-storage-cors.json',
          'services/platform-api/app/services/runtime_action_service.py',
          'services/platform-api/app/api/routes/storage.py',
          'services/platform-api/app/services/runtime_readiness.py',
          'web/src/lib/storageUploadService.ts',
          'web/src/components/superuser/OperationalReadinessCheckGrid.tsx',
          'web/src/pages/superuser/SuperuserOperationalReadiness.tsx',
        ],
        commands: [
          'cd services/platform-api && pytest -q tests/test_runtime_action_service.py tests/test_runtime_readiness_service.py tests/test_admin_runtime_readiness_routes.py tests/test_storage_routes.py',
          'cd web && npm run test -- src/lib/storageUploadService.test.ts src/components/superuser/OperationalReadinessCheckGrid.test.tsx src/pages/superuser/SuperuserOperationalReadiness.test.tsx',
        ],
      },
    },
  },
  {
    id: 'platform-api-bootstrap',
    patterns: [
      'scripts/start-platform-api.ps1',
      'scripts/platform-api-dev-control.ps1',
      'package.json',
      'services/platform-api/start-dev.sh',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'scripts/start-platform-api.ps1',
          'scripts/platform-api-dev-control.ps1',
          'package.json',
          'services/platform-api/start-dev.sh',
        ],
        commands: [
          'cd services/platform-api && pytest -q tests/test_dev_bootstrap_contract.py tests/test_procfile_startup.py',
        ],
      },
    },
  },
  {
    id: 'telemetry-truthfulness',
    patterns: [
      'services/platform-api/app/api/routes/telemetry.py',
      'services/platform-api/app/observability/**',
      'services/platform-api/OBSERVABILITY.md',
      'web/src/pages/ObservabilityTelemetry.tsx',
      'web/src/pages/ObservabilityTraces.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'services/platform-api/app/api/routes/telemetry.py',
          'services/platform-api/app/observability/**',
          'services/platform-api/OBSERVABILITY.md',
          'web/src/pages/ObservabilityTelemetry.tsx',
          'web/src/pages/ObservabilityTraces.tsx',
        ],
        commands: [
          'cd services/platform-api && pytest -q tests/test_observability.py tests/test_observability_contract.py',
          'cd web && npm run test -- src/pages/ObservabilityTelemetry.test.tsx src/pages/ObservabilityTraces.test.tsx',
        ],
      },
    },
  },
  {
    id: 'pipeline-services',
    patterns: [
      'services/platform-api/app/api/routes/pipelines.py',
      'services/platform-api/app/services/pipeline_storage.py',
      'services/platform-api/app/workers/pipeline_jobs.py',
      'web/src/pages/PipelineServicesPage.tsx',
      'web/src/components/pipelines/PipelineCatalogPanel.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'services/platform-api/app/api/routes/pipelines.py',
          'services/platform-api/app/services/pipeline_storage.py',
          'services/platform-api/app/workers/pipeline_jobs.py',
          'web/src/pages/PipelineServicesPage.tsx',
          'web/src/components/pipelines/PipelineCatalogPanel.tsx',
        ],
        commands: [
          'cd services/platform-api && pytest -q tests/test_pipelines_routes.py',
          'cd web && npm run test -- src/pages/PipelineServicesPage.test.tsx src/components/pipelines/PipelineCatalogPanel.test.tsx',
        ],
      },
    },
  },
  {
    id: 'index-builder',
    patterns: [
      'web/src/pages/IndexBuilderPage.tsx',
      'web/src/hooks/useIndexBuilderJob.ts',
      'web/src/hooks/usePipelineSourceSet.ts',
      'web/src/hooks/useIndexBuilderList.ts',
      'web/src/components/pipelines/IndexBuilderHeader.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'web/src/pages/IndexBuilderPage.tsx',
          'web/src/hooks/useIndexBuilderJob.ts',
          'web/src/hooks/usePipelineSourceSet.ts',
          'web/src/hooks/useIndexBuilderList.ts',
          'web/src/components/pipelines/IndexBuilderHeader.tsx',
        ],
        commands: [
          'cd web && npm run test -- src/pages/IndexBuilderPage.test.tsx src/hooks/useIndexBuilderJob.test.ts src/hooks/usePipelineSourceSet.test.ts src/hooks/useIndexBuilderList.test.ts',
        ],
      },
    },
  },
  {
    id: 'shared-selector-contract',
    patterns: [
      'web/src/components/shell/ProjectSwitcher.tsx',
      'web/src/components/shell/ProjectFocusSelectorPopover.tsx',
      'web/src/components/shell/TopCommandBar.tsx',
      'web/src/components/shell/TopCommandBar.css',
      'web/src/components/agchain/AgchainProjectSwitcher.tsx',
      'web/src/components/layout/AgchainShellLayout.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'web/src/components/shell/ProjectSwitcher.tsx',
          'web/src/components/shell/ProjectFocusSelectorPopover.tsx',
          'web/src/components/shell/TopCommandBar.tsx',
          'web/src/components/shell/TopCommandBar.css',
          'web/src/components/agchain/AgchainProjectSwitcher.tsx',
          'web/src/components/layout/AgchainShellLayout.tsx',
        ],
        commands: [
          'cd web && npm run test -- src/components/shell/ProjectSwitcher.test.tsx src/components/shell/ProjectFocusSelectorPopover.test.tsx src/components/shell/TopCommandBar.test.tsx src/components/agchain/AgchainProjectSwitcher.test.tsx src/components/layout/AgchainShellLayout.test.tsx',
        ],
      },
    },
  },
  {
    id: 'agchain-focus-sync',
    patterns: [
      'web/src/hooks/agchain/useAgchainProjectFocus.ts',
      'web/src/lib/agchainProjectFocus.ts',
      'web/src/components/agchain/AgchainWorkspaceSync.test.tsx',
      'web/src/pages/agchain/AgchainProjectsPage.tsx',
      'web/src/pages/agchain/AgchainOverviewPage.tsx',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'web/src/hooks/agchain/useAgchainProjectFocus.ts',
          'web/src/lib/agchainProjectFocus.ts',
          'web/src/components/agchain/AgchainWorkspaceSync.test.tsx',
          'web/src/pages/agchain/AgchainProjectsPage.tsx',
          'web/src/pages/agchain/AgchainOverviewPage.tsx',
        ],
        commands: [
          'cd web && npm run test -- src/hooks/agchain/useAgchainProjectFocus.test.tsx src/lib/agchainProjectFocus.test.ts src/components/agchain/AgchainWorkspaceSync.test.tsx src/pages/agchain/AgchainProjectsPage.test.tsx src/pages/agchain/AgchainOverviewPage.test.tsx',
        ],
      },
    },
  },
  {
    id: 'agchain-provider-model-surfaces',
    patterns: [
      'services/platform-api/app/api/routes/agchain_models.py',
      'services/platform-api/app/api/routes/agchain_organization_model_providers.py',
      'services/platform-api/app/api/routes/agchain_project_model_providers.py',
      'services/platform-api/app/domain/agchain/provider_registry.py',
      'services/platform-api/app/domain/agchain/provider_credentials.py',
      'web/src/pages/agchain/AgchainModelsPage.tsx',
      'web/src/pages/agchain/AgchainAiProvidersPage.tsx',
      'web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx',
      'web/src/components/agchain/models/**',
    ],
    stages: {
      'pre-push': {
        watchPatterns: [
          'services/platform-api/app/api/routes/agchain_models.py',
          'services/platform-api/app/api/routes/agchain_organization_model_providers.py',
          'services/platform-api/app/api/routes/agchain_project_model_providers.py',
          'services/platform-api/app/domain/agchain/provider_registry.py',
          'services/platform-api/app/domain/agchain/provider_credentials.py',
          'web/src/pages/agchain/AgchainModelsPage.tsx',
          'web/src/pages/agchain/AgchainAiProvidersPage.tsx',
          'web/src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.tsx',
          'web/src/components/agchain/models/**',
        ],
        commands: [
          'cd services/platform-api && pytest -q tests/test_agchain_model_providers.py tests/test_agchain_models.py',
          'cd web && npm run test -- src/pages/agchain/AgchainModelsPage.test.tsx src/pages/agchain/AgchainAiProvidersPage.test.tsx src/pages/agchain/settings/AgchainOrganizationAiProvidersPage.test.tsx src/components/agchain/models/AgchainProviderCredentialModal.test.tsx src/components/agchain/models/AgchainProviderCredentialsTable.test.tsx src/pages/agchain/AgchainPageArchitecture.test.ts',
        ],
      },
    },
  },
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function globToRegExp(pattern) {
  const normalized = pattern.replace(/\\/g, '/');
  const token = '__DOUBLE_STAR__';
  const escaped = escapeRegex(normalized)
    .replace(/\\\*\\\*/g, token)
    .replace(/\\\*/g, '[^/]*')
    .replace(new RegExp(token, 'g'), '.*');

  return new RegExp(`^${escaped}$`);
}

function normalizePath(candidatePath) {
  return candidatePath.replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function matchesAnyPattern(candidatePath, patterns) {
  const normalizedPath = normalizePath(candidatePath);
  return patterns.some((pattern) => globToRegExp(pattern).test(normalizedPath));
}

function quoteForShell(value) {
  if (!value.includes(' ')) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function getChangedWebFiles(changedPaths) {
  return changedPaths
    .filter((candidatePath) => normalizePath(candidatePath).startsWith('web/'))
    .map((candidatePath) => normalizePath(candidatePath).slice('web/'.length))
    .sort();
}

function resolveCommands(commands, { changedPaths }) {
  const changedWebFiles = getChangedWebFiles(changedPaths).map(quoteForShell).join(' ');
  return commands.map((command) => command.replace('{changedWebFiles}', changedWebFiles));
}

export const HOOK_FAMILIES = HOOK_FAMILY_DEFINITIONS;

export function selectHookGroups({ stage, changedPaths = [] }) {
  const normalizedPaths = changedPaths.map(normalizePath);

  return HOOK_FAMILIES.flatMap((group) => {
    const stageConfig = group.stages[stage];
    if (!stageConfig) {
      return [];
    }

    const watchPatterns = stageConfig.watchPatterns ?? group.patterns;
    const shouldRun = stageConfig.alwaysRun || matchesAnyPatternList(normalizedPaths, watchPatterns);
    if (!shouldRun) {
      return [];
    }

    return [{
      id: group.id,
      commands: resolveCommands(stageConfig.commands, { changedPaths: normalizedPaths }),
    }];
  });
}

function matchesAnyPatternList(changedPaths, patterns) {
  if (changedPaths.length === 0) {
    return false;
  }

  return changedPaths.some((candidatePath) => matchesAnyPattern(candidatePath, patterns));
}
