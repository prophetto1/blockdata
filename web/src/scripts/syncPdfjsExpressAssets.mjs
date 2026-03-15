import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const sourceDir = path.resolve(projectRoot, 'node_modules', '@pdftron', 'pdfjs-express', 'public');
const targetDir = path.resolve(projectRoot, 'public', 'vendor', 'pdfjs-express');

if (!existsSync(sourceDir)) {
  console.error('PDF.js Express assets were not found. Run npm install first.');
  process.exit(1);
}

mkdirSync(path.dirname(targetDir), { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true, force: true });
