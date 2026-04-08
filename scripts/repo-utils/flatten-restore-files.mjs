import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

function hashText(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
}

function sanitizeSegment(segment) {
  const cleaned = segment.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || 'root';
}

function parseArgs(argv) {
  const options = {
    source: '__start-here/restore',
    output: '__start-here/restore-flat',
    mode: 'copy',
    dryRun: false,
    excludeBasenames: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--source') {
      options.source = argv[++index];
    } else if (arg === '--output') {
      options.output = argv[++index];
    } else if (arg === '--mode') {
      options.mode = argv[++index];
    } else if (arg === '--move') {
      options.mode = 'move';
    } else if (arg === '--copy') {
      options.mode = 'copy';
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--exclude-basename') {
      options.excludeBasenames.push(argv[++index]);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!['copy', 'move'].includes(options.mode)) {
    throw new Error(`Unsupported mode "${options.mode}". Use "copy" or "move".`);
  }

  return options;
}

function isNestedPath(parentDir, childDir) {
  const relative = path.relative(parentDir, childDir);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function walkFiles(rootDir) {
  const collected = [];

  function visit(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else if (entry.isFile()) {
        collected.push(absolutePath);
      }
    }
  }

  visit(rootDir);
  return collected;
}

function buildFlatName(sourceRelativePath, groupSize, usedNames) {
  const parsed = path.parse(sourceRelativePath);

  if (groupSize === 1) {
    const candidate = parsed.base;
    if (!usedNames.has(candidate.toLowerCase())) {
      usedNames.add(candidate.toLowerCase());
      return candidate;
    }
  }

  const parentDir = path.dirname(sourceRelativePath);
  const parentSuffix = parentDir === '.'
    ? 'root'
    : parentDir.split(path.sep).map(sanitizeSegment).join('__');
  const initialCandidate = `${parsed.name}__${parentSuffix}${parsed.ext}`;
  let candidate = initialCandidate;
  let counter = 1;

  while (usedNames.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${parsed.name}__${parentSuffix}__${hashText(`${sourceRelativePath}:${counter}`)}${parsed.ext}`;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export function planFlatten({
  source,
  output,
  excludeBasenames = [],
  cwd = process.cwd(),
} = {}) {
  const resolvedSource = path.resolve(cwd, source ?? '__start-here/restore');
  const resolvedOutput = path.resolve(cwd, output ?? '__start-here/restore-flat');
  const excludeSet = new Set(excludeBasenames.map((name) => name.toLowerCase()));

  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Source directory does not exist: ${resolvedSource}`);
  }

  if (!fs.statSync(resolvedSource).isDirectory()) {
    throw new Error(`Source path is not a directory: ${resolvedSource}`);
  }

  if (resolvedSource === resolvedOutput) {
    throw new Error('Output directory cannot be the same as the source directory.');
  }

  if (isNestedPath(resolvedSource, resolvedOutput)) {
    throw new Error('Output directory cannot be nested inside the source directory.');
  }

  const absoluteFiles = walkFiles(resolvedSource).filter((absoluteFile) => {
    const basename = path.basename(absoluteFile).toLowerCase();
    return !excludeSet.has(basename);
  });

  const files = absoluteFiles.map((absoluteFile) => {
    const sourceRelativePath = path.relative(resolvedSource, absoluteFile);
    const stats = fs.statSync(absoluteFile);
    return {
      sourceAbsolutePath: absoluteFile,
      sourceRelativePath,
      basename: path.basename(absoluteFile),
      size: stats.size,
    };
  });

  const basenameCounts = new Map();
  for (const file of files) {
    const key = file.basename.toLowerCase();
    basenameCounts.set(key, (basenameCounts.get(key) ?? 0) + 1);
  }

  const usedNames = new Set();
  const entries = files
    .sort((left, right) => left.sourceRelativePath.localeCompare(right.sourceRelativePath))
    .map((file) => {
      const groupSize = basenameCounts.get(file.basename.toLowerCase()) ?? 1;
      const flatName = buildFlatName(file.sourceRelativePath, groupSize, usedNames);
      return {
        ...file,
        flatName,
        outputAbsolutePath: path.join(resolvedOutput, flatName),
      };
    })
    .sort((left, right) => left.flatName.localeCompare(right.flatName) || left.sourceRelativePath.localeCompare(right.sourceRelativePath));

  return {
    sourceRoot: resolvedSource,
    outputRoot: resolvedOutput,
    fileCount: entries.length,
    collisionCount: [...basenameCounts.values()].filter((count) => count > 1).length,
    entries,
  };
}

function ensureOutputDirectory(outputRoot) {
  if (!fs.existsSync(outputRoot)) {
    fs.mkdirSync(outputRoot, { recursive: true });
    return;
  }

  const existingEntries = fs.readdirSync(outputRoot);
  if (existingEntries.length > 0) {
    throw new Error(`Output directory is not empty: ${outputRoot}`);
  }
}

function writeManifest(plan) {
  const jsonPath = path.join(plan.outputRoot, 'flatten-manifest.json');
  const csvPath = path.join(plan.outputRoot, 'flatten-manifest.csv');
  const manifest = plan.entries.map((entry) => ({
    flatName: entry.flatName,
    sourceRelativePath: entry.sourceRelativePath,
    size: entry.size,
  }));

  fs.writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const csvRows = [
    'flatName,sourceRelativePath,size',
    ...manifest.map((row) => {
      const escapedFlatName = JSON.stringify(row.flatName);
      const escapedSourcePath = JSON.stringify(row.sourceRelativePath);
      return `${escapedFlatName},${escapedSourcePath},${row.size}`;
    }),
  ];
  fs.writeFileSync(csvPath, `${csvRows.join('\n')}\n`, 'utf8');
}

export function executeFlatten(plan, { mode = 'copy', dryRun = false } = {}) {
  if (dryRun) {
    return {
      copiedCount: 0,
      movedCount: 0,
      manifestWritten: false,
    };
  }

  ensureOutputDirectory(plan.outputRoot);

  for (const entry of plan.entries) {
    if (mode === 'move') {
      fs.renameSync(entry.sourceAbsolutePath, entry.outputAbsolutePath);
    } else {
      fs.copyFileSync(entry.sourceAbsolutePath, entry.outputAbsolutePath);
    }
  }

  writeManifest(plan);

  return {
    copiedCount: mode === 'copy' ? plan.entries.length : 0,
    movedCount: mode === 'move' ? plan.entries.length : 0,
    manifestWritten: true,
  };
}

function printHelp() {
  console.log(`Flatten nested files from a source tree into a single review folder.

Usage:
  node scripts/flatten-restore-files.mjs [options]

Options:
  --source <dir>             Source directory. Default: __start-here/restore
  --output <dir>             Flat output directory. Default: __start-here/restore-flat
  --mode <copy|move>         Copy or move source files into the flat output. Default: copy
  --move                     Shortcut for --mode move
  --copy                     Shortcut for --mode copy
  --exclude-basename <name>  Skip files with this basename. Can be repeated.
  --dry-run                  Print the plan without creating the flat folder
  --help                     Show this help message
`);
}

function printSummary(plan, options) {
  console.log(JSON.stringify({
    sourceRoot: plan.sourceRoot,
    outputRoot: plan.outputRoot,
    fileCount: plan.fileCount,
    collisionGroups: plan.collisionCount,
    mode: options.mode,
    dryRun: options.dryRun,
  }, null, 2));

  const previewCount = Math.min(plan.entries.length, 20);
  if (previewCount > 0) {
    console.log('\nPreview:');
    for (const entry of plan.entries.slice(0, previewCount)) {
      console.log(`${entry.flatName} <= ${entry.sourceRelativePath}`);
    }
  }

  if (plan.entries.length > previewCount) {
    console.log(`... ${plan.entries.length - previewCount} more files`);
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    const plan = planFlatten(options);
    printSummary(plan, options);
    const result = executeFlatten(plan, options);

    if (!options.dryRun) {
      console.log('\nCompleted:');
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
