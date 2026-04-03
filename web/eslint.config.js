import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const agchainMountedRealPages = [
  'src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx',
  'src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx',
  'src/pages/agchain/AgchainProjectsPage.tsx',
  'src/pages/agchain/AgchainOverviewPage.tsx',
  'src/pages/agchain/AgchainDatasetsPage.tsx',
  'src/pages/agchain/AgchainToolsPage.tsx',
  'src/pages/agchain/AgchainBenchmarksPage.tsx',
]

const agchainMountedPlaceholderPages = [
  'src/pages/agchain/AgchainPromptsPage.tsx',
  'src/pages/agchain/AgchainScorersPage.tsx',
  'src/pages/agchain/AgchainParametersPage.tsx',
  'src/pages/agchain/AgchainRunsPage.tsx',
  'src/pages/agchain/AgchainResultsPage.tsx',
  'src/pages/agchain/AgchainObservabilityPage.tsx',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: [
      'src/components/common/PageHeader.tsx',
      'src/pages/AgentOnboardingAuth.tsx',
      'src/pages/AgentOnboardingConnect.tsx',
      'src/pages/AgentOnboardingSelect.tsx',
      'src/components/agents/forms/ApiKeyPanel.tsx',
      'src/components/agents/forms/GoogleAuthPanel.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@mantine/*'],
        },
      ],
    },
  },
  {
    files: agchainMountedRealPages,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/AgchainSectionPage',
                '@/pages/agchain/AgchainSectionPage',
                '**/AgchainSettingsSectionLayout',
                '@/components/agchain/settings/AgchainSettingsSectionLayout',
              ],
              message: 'Mounted AGChain real pages must not import deprecated wrapper pages.',
            },
          ],
        },
      ],
    },
  },
  {
    files: agchainMountedPlaceholderPages,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/AgchainSectionPage',
                '@/pages/agchain/AgchainSectionPage',
              ],
              message: 'Mounted in-scope AGChain placeholder pages must use AgchainProjectPlaceholderPage instead of AgchainSectionPage.',
            },
          ],
        },
      ],
    },
  },
])
