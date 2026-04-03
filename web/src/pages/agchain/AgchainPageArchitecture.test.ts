import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../../..');

const MOUNTED_REAL_PAGES = [
  'src/pages/agchain/settings/AgchainOrganizationMembersPage.tsx',
  'src/pages/agchain/settings/AgchainPermissionGroupsPage.tsx',
  'src/pages/agchain/AgchainProjectsPage.tsx',
  'src/pages/agchain/AgchainOverviewPage.tsx',
  'src/pages/agchain/AgchainDatasetsPage.tsx',
  'src/pages/agchain/AgchainToolsPage.tsx',
  'src/pages/agchain/AgchainBenchmarksPage.tsx',
] as const;

const MOUNTED_PLACEHOLDER_PAGES = [
  'src/pages/agchain/AgchainPromptsPage.tsx',
  'src/pages/agchain/AgchainScorersPage.tsx',
  'src/pages/agchain/AgchainParametersPage.tsx',
  'src/pages/agchain/AgchainRunsPage.tsx',
  'src/pages/agchain/AgchainResultsPage.tsx',
  'src/pages/agchain/AgchainObservabilityPage.tsx',
] as const;

const MOUNTED_EXEMPT_PAGES = [
  'src/pages/agchain/AgchainSettingsPage.tsx',
  'src/pages/agchain/AgchainDatasetCreatePage.tsx',
  'src/pages/agchain/AgchainDatasetDetailPage.tsx',
  'src/pages/agchain/AgchainDatasetVersionDraftPage.tsx',
  'src/pages/agchain/AgchainBenchmarkWorkbenchPage.tsx',
  'src/pages/agchain/AgchainModelsPage.tsx',
] as const;

const COMPATIBILITY_SECTION_PAGES = [
  'src/pages/agchain/AgchainBuildPage.tsx',
  'src/pages/agchain/AgchainArtifactsPage.tsx',
  'src/pages/agchain/AgchainDashboardPage.tsx',
] as const;

const REAL_PAGE_FORBIDDEN_IMPORTS = [
  'AgchainSectionPage',
  'AgchainProjectPlaceholderPage',
  'AgchainSettingsSectionLayout',
  'AgchainSettingsPlaceholderLayout',
  'AgchainSettingsPlaceholderPage',
] as const;

function fromWeb(relativePath: string) {
  return path.join(webRoot, relativePath);
}

function read(relativePath: string) {
  return fs.readFileSync(fromWeb(relativePath), 'utf8');
}

function getMountedPagesFromRouter() {
  const routerSource = read('src/router.tsx');
  return Array.from(
    new Set(
      Array.from(
        routerSource.matchAll(/@\/pages\/agchain(?:\/settings)?\/[A-Za-z0-9/]+Page/g),
        (match) => `${match[0].replace('@/', 'src/')}.tsx`,
      ),
    ),
  ).sort();
}

function getRuntimePageFiles() {
  const agchainPagesDir = fromWeb('src/pages/agchain');
  const settingsPagesDir = fromWeb('src/pages/agchain/settings');

  return [
    ...fs.readdirSync(agchainPagesDir).map((name) => `src/pages/agchain/${name}`),
    ...fs.readdirSync(settingsPagesDir).map((name) => `src/pages/agchain/settings/${name}`),
  ].filter((relativePath) => relativePath.endsWith('Page.tsx'));
}

describe('AGChain page architecture', () => {
  it('classifies every mounted AGChain page file from the route tree', () => {
    const classifiedPages = [
      ...MOUNTED_REAL_PAGES,
      ...MOUNTED_PLACEHOLDER_PAGES,
      ...MOUNTED_EXEMPT_PAGES,
    ].sort();

    expect(getMountedPagesFromRouter()).toEqual(classifiedPages);
  });

  it('keeps mounted real pages free of deprecated wrappers and placeholder scaffolds', () => {
    for (const relativePath of MOUNTED_REAL_PAGES) {
      const source = read(relativePath);

      for (const forbiddenImport of REAL_PAGE_FORBIDDEN_IMPORTS) {
        expect(source).not.toContain(forbiddenImport);
      }
    }
  });

  it('keeps mounted in-scope placeholder pages off AgchainSectionPage', () => {
    for (const relativePath of MOUNTED_PLACEHOLDER_PAGES) {
      const source = read(relativePath);
      expect(source).toContain('AgchainProjectPlaceholderPage');
      expect(source).not.toContain('AgchainSectionPage');
    }
  });

  it('retains AgchainSectionPage only for the explicit compatibility pages', () => {
    const sectionPageImporters = getRuntimePageFiles()
      .filter((relativePath) => relativePath !== 'src/pages/agchain/AgchainSectionPage.tsx')
      .filter((relativePath) => /from ['"][^'"]*AgchainSectionPage['"]/.test(read(relativePath)))
      .sort();

    expect(sectionPageImporters).toEqual([...COMPATIBILITY_SECTION_PAGES].sort());
  });
});
