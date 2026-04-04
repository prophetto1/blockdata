import { cpSync, existsSync, mkdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);
const pdfjsExpressDir = path.dirname(require.resolve('@pdftron/pdfjs-express/package.json'));
const sourceDir = path.resolve(pdfjsExpressDir, 'public');
const targetDir = path.resolve(projectRoot, 'public', 'vendor', 'pdfjs-express');

if (!existsSync(sourceDir)) {
  console.error('PDF.js Express assets were not found. Run npm install first.');
  process.exit(1);
}

mkdirSync(path.dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true, force: true });
