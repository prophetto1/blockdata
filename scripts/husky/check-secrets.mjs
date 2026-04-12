import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SECRET_ENV_VARS = new Set([
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'AZURE_OPENAI_API_KEY',
]);

const TOKEN_PREFIXES = ['ghp_', 'github_pat_', 'sk-', 'xoxb-', 'AIza'];
const PLACEHOLDER_RE = /^(?:<[^>]+>|YOUR_[A-Z0-9_]+_HERE|changeme|example|fake|dummy|test|\/path\/to\/.*)$/i;
const SUPPRESSION_TOKEN = 'husky: allow-secret-example';

function normalizeOutput(value) {
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return String(value ?? '');
}

function isTemplateLike(filePath) {
  const basename = path.basename(filePath).toLowerCase();
  return basename === '.env.example' || basename.endsWith('.example') || basename.endsWith('.template');
}

function isDocOrTestOrTemplate(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return (
    normalized.endsWith('.md') ||
    normalized.endsWith('.mdx') ||
    normalized.endsWith('.txt') ||
    normalized.endsWith('.test.ts') ||
    normalized.endsWith('.test.tsx') ||
    normalized.endsWith('.test.js') ||
    normalized.endsWith('.test.mjs') ||
    normalized.includes('/tests/') ||
    isTemplateLike(normalized)
  );
}

function isPlaceholderValue(value) {
  return value === '' || PLACEHOLDER_RE.test(value);
}

function pushFinding(findings, filePath, lineNumber, reason, line) {
  findings.push({ file: filePath, lineNumber, reason, line });
}

function scanLineForSecrets({ filePath, lineNumber, line, previousLine, findings }) {
  const suppressed = previousLine.includes(SUPPRESSION_TOKEN) && isDocOrTestOrTemplate(filePath);

  if (/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/.test(line)) {
    pushFinding(findings, filePath, lineNumber, 'private key material detected', line);
    return;
  }

  if (/"private_key"\s*:\s*".+"/.test(line)) {
    pushFinding(findings, filePath, lineNumber, 'private key JSON blob detected', line);
    return;
  }

  const envMatch = line.match(/^\+?([A-Z0-9_]+)=(.*)$/);
  if (envMatch && SECRET_ENV_VARS.has(envMatch[1])) {
    const value = envMatch[2].trim();
    if (!suppressed && (!isTemplateLike(filePath) || !isPlaceholderValue(value))) {
      if (!isPlaceholderValue(value)) {
        pushFinding(findings, filePath, lineNumber, `secret env var assignment detected for ${envMatch[1]}`, line);
        return;
      }
    }
  }

  for (const prefix of TOKEN_PREFIXES) {
    const match = line.match(new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[A-Za-z0-9_-]+`));
    if (!match) {
      continue;
    }

    if (isPlaceholderValue(match[0])) {
      continue;
    }

    if (!suppressed) {
      pushFinding(findings, filePath, lineNumber, `token prefix detected (${prefix})`, line);
    }
    return;
  }
}

export function scanDiffForSecrets(diffText) {
  const findings = [];
  let currentFile = null;
  let currentLineNumber = 0;
  let previousAddedLine = '';

  for (const rawLine of String(diffText ?? '').split(/\r?\n/)) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.slice(6).trim();
      previousAddedLine = '';
      continue;
    }

    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/\+(\d+)/);
      currentLineNumber = match ? Number.parseInt(match[1], 10) : 0;
      previousAddedLine = '';
      continue;
    }

    if (!currentFile || !rawLine.startsWith('+') || rawLine.startsWith('+++')) {
      continue;
    }

    const line = rawLine.slice(1);
    scanLineForSecrets({
      filePath: currentFile,
      lineNumber: currentLineNumber,
      line,
      previousLine: previousAddedLine,
      findings,
    });
    previousAddedLine = line;
    currentLineNumber += 1;
  }

  return { findings };
}

function readStagedDiff() {
  return normalizeOutput(execFileSync('git', ['diff', '--cached', '--unified=0', '--no-color', '--diff-filter=ACMR']));
}

function main(argv) {
  if (!argv.includes('--staged')) {
    console.error('Expected --staged');
    return 1;
  }

  const result = scanDiffForSecrets(readStagedDiff());
  for (const finding of result.findings) {
    console.error(`${finding.file}:${finding.lineNumber} ${finding.reason}`);
  }
  return result.findings.length > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
