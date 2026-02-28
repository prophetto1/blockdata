import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(webRoot, '..');
const pagesDir = path.join(webRoot, 'src', 'pages');
const routerFile = path.join(webRoot, 'src', 'router.tsx');
const outputDir = path.join(webRoot, 'docs');
const publicOutputDir = path.join(webRoot, 'public');
const jsonOutput = path.join(outputDir, 'component-inventory.json');
const mdOutput = path.join(outputDir, 'component-inventory.md');
const publicJsonOutput = path.join(publicOutputDir, 'component-inventory.json');

function parseScopeArg() {
  const args = process.argv.slice(2);
  const scopeArg = args.find((arg) => arg.startsWith('--scope='));
  const scope = scopeArg ? scopeArg.slice('--scope='.length).trim().toLowerCase() : 'auth';
  if (scope !== 'auth' && scope !== 'all') {
    throw new Error(`Invalid --scope value "${scope}". Use --scope=auth or --scope=all.`);
  }
  return scope;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
      continue;
    }
    files.push(full);
  }
  return files;
}

function parseImports(sourceFile) {
  const imports = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;

    const importPath = statement.moduleSpecifier.text;
    const importClause = statement.importClause;
    if (!importClause) continue;

    if (importClause.name) {
      const local = importClause.name.text;
      imports.set(local, {
        local,
        imported: 'default',
        source: importPath,
        kind: 'default',
      });
    }

    const bindings = importClause.namedBindings;
    if (!bindings) continue;

    if (ts.isNamespaceImport(bindings)) {
      const local = bindings.name.text;
      imports.set(local, {
        local,
        imported: '*',
        source: importPath,
        kind: 'namespace',
      });
      continue;
    }

    for (const specifier of bindings.elements) {
      const local = specifier.name.text;
      const imported = specifier.propertyName?.text ?? local;
      imports.set(local, {
        local,
        imported,
        source: importPath,
        kind: 'named',
      });
    }
  }

  return imports;
}

function parseInFileComponents(sourceFile) {
  const names = new Set();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      if (/^[A-Z]/.test(name)) names.add(name);
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const name = decl.name.text;
        if (!/^[A-Z]/.test(name)) continue;

        const init = decl.initializer;
        if (!init) continue;
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
          names.add(name);
        }
      }
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const name = node.name.text;
      if (/^[A-Z]/.test(name)) names.add(name);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return names;
}

function parseJsxUsages(sourceFile) {
  const usages = [];

  function fromTagName(tagName) {
    if (ts.isIdentifier(tagName)) {
      return {
        root: tagName.text,
        member: null,
        usedAs: tagName.text,
      };
    }
    if (ts.isPropertyAccessExpression(tagName)) {
      const usedAs = tagName.getText(sourceFile);
      let rootExpr = tagName.expression;
      while (ts.isPropertyAccessExpression(rootExpr)) {
        rootExpr = rootExpr.expression;
      }
      if (ts.isIdentifier(rootExpr)) {
        return {
          root: rootExpr.text,
          member: tagName.name.text,
          usedAs,
        };
      }
      return null;
    }
    return null;
  }

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node)) {
      const data = fromTagName(node.tagName);
      if (data && /^[A-Z]/.test(data.root)) usages.push(data);
    } else if (ts.isJsxOpeningElement(node)) {
      const data = fromTagName(node.tagName);
      if (data && /^[A-Z]/.test(data.root)) usages.push(data);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usages;
}

function classifySource(source, rootName, inFileComponents) {
  if (inFileComponents.has(rootName)) return 'in-file component';
  if (!source) return 'unknown';

  if (source.startsWith('@ark-ui/react')) return 'ark-ui';
  if (source.startsWith('@mantine/')) return 'mantine';
  if (source === '@tabler/icons-react') return 'tabler-icons';
  if (source === 'lucide-react') return 'lucide-icons';
  if (source.startsWith('@/components/')) return 'local-components';
  if (source.startsWith('@/pages/')) return 'local-pages';
  if (source.startsWith('@/')) return 'local-module';
  if (source.startsWith('./') || source.startsWith('../')) return 'relative-local';
  return 'external-package';
}

function createDefinition({ rootName, usedAs, importInfo, category }) {
  if (category === 'in-file component') {
    return `${usedAs} is defined in the same page file`;
  }
  if (importInfo) {
    return `${usedAs} comes from ${importInfo.source} (${importInfo.kind} import of ${importInfo.imported})`;
  }
  return `${usedAs} was detected in JSX but no matching import was resolved`;
}

function makePageRecord(filePath, source) {
  const relPath = toPosix(path.relative(webRoot, filePath));
  const sourceFile = ts.createSourceFile(
    relPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const imports = parseImports(sourceFile);
  const inFileComponents = parseInFileComponents(sourceFile);
  const jsxUsages = parseJsxUsages(sourceFile);

  const seen = new Set();
  const components = [];

  for (const usage of jsxUsages) {
    const key = usage.usedAs;
    if (seen.has(key)) continue;
    seen.add(key);

    const importInfo = imports.get(usage.root);
    const category = classifySource(importInfo?.source, usage.root, inFileComponents);
    components.push({
      component: usage.root,
      usedAs: usage.usedAs,
      source: importInfo?.source ?? '(in-file or unresolved)',
      importKind: importInfo?.kind ?? null,
      importedAs: importInfo?.imported ?? null,
      category,
      definition: createDefinition({
        rootName: usage.root,
        usedAs: usage.usedAs,
        importInfo,
        category,
      }),
    });
  }

  components.sort((a, b) => a.usedAs.localeCompare(b.usedAs));

  const categoryCounts = components.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    page: relPath,
    componentCount: components.length,
    categoryCounts,
    components,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Component Inventory');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Scope: ${report.scope}`);
  lines.push('');
  lines.push(`Pages scanned: ${report.pages.length}`);
  lines.push(`Unique component usages: ${report.totalComponentUsages}`);
  lines.push('');
  lines.push('## Category Totals');
  lines.push('');
  lines.push('| Category | Count |');
  lines.push('| --- | ---: |');
  for (const [category, count] of Object.entries(report.categoryTotals).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(`| ${category} | ${count} |`);
  }
  lines.push('');

  for (const page of report.pages) {
    lines.push(`## ${page.page}`);
    lines.push('');
    lines.push(`Component usages: ${page.componentCount}`);
    lines.push('');
    lines.push('| Used As | Source | Category | Definition |');
    lines.push('| --- | --- | --- | --- |');
    for (const item of page.components) {
      lines.push(
        `| \`${item.usedAs}\` | \`${item.source}\` | ${item.category} | ${item.definition} |`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function collectJsxComponentNames(node, sourceFile) {
  const names = new Set();

  function fromTagName(tagName) {
    if (ts.isIdentifier(tagName)) return tagName.text;
    if (ts.isPropertyAccessExpression(tagName)) {
      let rootExpr = tagName.expression;
      while (ts.isPropertyAccessExpression(rootExpr)) {
        rootExpr = rootExpr.expression;
      }
      if (ts.isIdentifier(rootExpr)) return rootExpr.text;
    }
    return null;
  }

  function visit(current) {
    if (ts.isJsxSelfClosingElement(current)) {
      const name = fromTagName(current.tagName);
      if (name) names.add(name);
    } else if (ts.isJsxOpeningElement(current)) {
      const name = fromTagName(current.tagName);
      if (name) names.add(name);
    }
    ts.forEachChild(current, visit);
  }

  if (node) visit(node);
  return names;
}

function getObjectPropertyInitializer(objectLiteral, propertyName) {
  for (const prop of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isIdentifier(prop.name)) continue;
    if (prop.name.text === propertyName) {
      return prop.initializer;
    }
  }
  return null;
}

function parsePageImportsFromRouter(sourceFile) {
  const pageImports = new Map();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const source = statement.moduleSpecifier.text;
    if (!source.startsWith('@/pages/')) continue;

    const clause = statement.importClause;
    if (!clause) continue;

    if (clause.name) {
      pageImports.set(clause.name.text, source);
    }

    const bindings = clause.namedBindings;
    if (!bindings) continue;
    if (ts.isNamespaceImport(bindings)) {
      pageImports.set(bindings.name.text, source);
      continue;
    }
    for (const el of bindings.elements) {
      pageImports.set(el.name.text, source);
    }
  }
  return pageImports;
}

function resolveRouterAuthPageSources(sourceFile) {
  const pageImports = parsePageImportsFromRouter(sourceFile);
  const authSources = new Set();

  function walkRouteObject(routeObject, inAuthGuard) {
    const elementInit = getObjectPropertyInitializer(routeObject, 'element');
    const childrenInit = getObjectPropertyInitializer(routeObject, 'children');
    const componentNames = collectJsxComponentNames(elementInit, sourceFile);
    const nextInAuthGuard = inAuthGuard || componentNames.has('AuthGuard');

    if (nextInAuthGuard) {
      for (const componentName of componentNames) {
        const source = pageImports.get(componentName);
        if (source) authSources.add(source);
      }
    }

    if (!childrenInit || !ts.isArrayLiteralExpression(childrenInit)) return;
    for (const child of childrenInit.elements) {
      if (ts.isObjectLiteralExpression(child)) {
        walkRouteObject(child, nextInAuthGuard);
      }
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createBrowserRouter') {
      const firstArg = node.arguments[0];
      if (firstArg && ts.isArrayLiteralExpression(firstArg)) {
        for (const route of firstArg.elements) {
          if (ts.isObjectLiteralExpression(route)) {
            walkRouteObject(route, false);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return authSources;
}

async function resolvePageFilesFromSources(sources, allPageFiles) {
  const normalizedAll = new Set(allPageFiles.map((f) => path.resolve(f).toLowerCase()));
  const resolved = new Set();

  const settingsFiles = allPageFiles
    .filter((f) => toPosix(path.relative(webRoot, f)).startsWith('src/pages/settings/'))
    .map((f) => path.resolve(f));

  for (const source of sources) {
    if (source === '@/pages/settings') {
      for (const file of settingsFiles) resolved.add(file);
      continue;
    }

    if (!source.startsWith('@/pages/')) continue;
    const rel = source.slice('@/pages/'.length);
    const candidates = [
      path.join(pagesDir, `${rel}.tsx`),
      path.join(pagesDir, `${rel}.jsx`),
      path.join(pagesDir, rel, 'index.tsx'),
      path.join(pagesDir, rel, 'index.jsx'),
    ];

    for (const candidate of candidates) {
      const normalized = path.resolve(candidate).toLowerCase();
      if (normalizedAll.has(normalized) && await fileExists(candidate)) {
        resolved.add(path.resolve(candidate));
      }
    }
  }

  return resolved;
}

async function resolveAuthScopedPageFiles(allPageFiles) {
  const routerSource = await fs.readFile(routerFile, 'utf8');
  const routerSourceFile = ts.createSourceFile(
    'src/router.tsx',
    routerSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const authSources = resolveRouterAuthPageSources(routerSourceFile);
  return resolvePageFilesFromSources(authSources, allPageFiles);
}

async function main() {
  const scope = parseScopeArg();
  const allFiles = await walk(pagesDir);
  const allPageFiles = allFiles
    .filter((f) => /\.(tsx|jsx)$/.test(f))
    .sort((a, b) => a.localeCompare(b));

  const authScopedFiles = scope === 'auth'
    ? await resolveAuthScopedPageFiles(allPageFiles)
    : null;

  const pageFiles = scope === 'auth'
    ? allPageFiles.filter((f) => authScopedFiles?.has(path.resolve(f)))
    : allPageFiles;

  const pages = [];
  for (const file of pageFiles) {
    const source = await fs.readFile(file, 'utf8');
    pages.push(makePageRecord(file, source));
  }

  const categoryTotals = {};
  let totalComponentUsages = 0;
  for (const page of pages) {
    totalComponentUsages += page.componentCount;
    for (const [category, count] of Object.entries(page.categoryCounts)) {
      categoryTotals[category] = (categoryTotals[category] ?? 0) + count;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scope,
    pages,
    totalComponentUsages,
    categoryTotals,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(publicOutputDir, { recursive: true });
  await fs.writeFile(jsonOutput, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(mdOutput, renderMarkdown(report), 'utf8');
  await fs.writeFile(publicJsonOutput, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Wrote ${toPosix(path.relative(repoRoot, jsonOutput))}`);
  console.log(`Wrote ${toPosix(path.relative(repoRoot, mdOutput))}`);
  console.log(`Wrote ${toPosix(path.relative(repoRoot, publicJsonOutput))}`);
  console.log(`Scope: ${scope} | Pages: ${pageFiles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
