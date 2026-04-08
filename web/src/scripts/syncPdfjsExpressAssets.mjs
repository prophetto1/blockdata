import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);
const requiredAssetMarkers = ['ui/index.html', 'core/webviewer-core.min.js'];

function hasPdfjsExpressAssets(directory) {
  return requiredAssetMarkers.every((relativePath) => existsSync(path.join(directory, relativePath)));
}

function resolvePdfjsExpressPackageDir() {
  try {
    return path.dirname(require.resolve('@pdftron/pdfjs-express/package.json'));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}

export function syncPdfjsExpressAssets({
  packageDir,
  destinationDir = path.resolve(projectRoot, 'public', 'vendor', 'pdfjs-express'),
} = {}) {
  const resolvedPackageDir = packageDir ?? resolvePdfjsExpressPackageDir();
  const sourceDir = resolvedPackageDir ? path.resolve(resolvedPackageDir, 'public') : null;

  if (sourceDir && hasPdfjsExpressAssets(sourceDir)) {
    mkdirSync(path.dirname(destinationDir), { recursive: true });
    cpSync(sourceDir, destinationDir, { recursive: true, force: true });
    return { mode: 'copied', sourceDir, destinationDir };
  }

  if (hasPdfjsExpressAssets(destinationDir)) {
    console.warn(
      sourceDir
        ? `PDF.js Express package assets were not found at ${sourceDir}. Using committed assets in ${destinationDir}.`
        : `PDF.js Express package could not be resolved. Using committed assets in ${destinationDir}.`
    );
    return { mode: 'fallback', sourceDir, destinationDir };
  }

  throw new Error(
    sourceDir
      ? `PDF.js Express assets were not found at ${sourceDir}, and no committed fallback exists at ${destinationDir}.`
      : `PDF.js Express package could not be resolved, and no committed fallback exists at ${destinationDir}.`
  );
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const currentFilePath = fileURLToPath(import.meta.url);
const isDirectRun = entryPath === currentFilePath;

if (isDirectRun) {
  try {
    syncPdfjsExpressAssets();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
