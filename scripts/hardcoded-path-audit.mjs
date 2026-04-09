import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mdx",
  ".mjs",
  ".ps1",
  ".py",
  ".sh",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const SKIP_DIRECTORIES = new Set([
  ".git",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

const DEFAULT_TARGETS = [
  "__start-here",
  "docs",
  "scripts",
  "services",
  "supabase",
  "web",
  ".github",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "package.json",
];

const PATTERN_DEFINITIONS = [
  {
    name: "windows-drive-path",
    regex: /(?<![A-Za-z0-9_])[A-Za-z]:\\(?:[^\\/:*?"<>|`\r\n]+\\)*[^\\/:*?"<>|`\r\n]+/g,
  },
  {
    name: "unc-path",
    regex: /\\\\[A-Za-z0-9._-]+\\[A-Za-z0-9.$ _-]+(?:\\[^\\/:*?"<>|`\r\n]+)*/g,
  },
];

function normalizePathMatch(match) {
  return match.replace(/[)`.,;:]+$/g, "");
}

export function collectHardcodedPathFindings(filePath, text) {
  const findings = [];

  text.split("\n").forEach((lineText, index) => {
    for (const { name, regex } of PATTERN_DEFINITIONS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const normalizedMatch = normalizePathMatch(match[0]);
        findings.push({
          filePath,
          line: index + 1,
          column: match.index + 1,
          match: normalizedMatch,
          rule: name,
        });
      }
    }
  });

  return findings;
}

function collectFiles(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    return [];
  }

  const stats = fs.statSync(resolved);
  if (stats.isFile()) {
    return TEXT_EXTENSIONS.has(path.extname(resolved).toLowerCase()) ? [resolved] : [];
  }

  return walkDirectory(resolved);
}

function walkDirectory(dirPath) {
  const results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDirectory(fullPath));
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

function collectUniqueFiles(targets) {
  const uniqueFiles = [];
  const seen = new Set();

  for (const filePath of targets.flatMap(collectFiles)) {
    if (seen.has(filePath)) {
      continue;
    }

    seen.add(filePath);
    uniqueFiles.push(filePath);
  }

  return uniqueFiles;
}

export function runHardcodedPathAudit(targets = DEFAULT_TARGETS) {
  const findings = [];

  for (const filePath of collectUniqueFiles(targets)) {
    if (!fs.statSync(filePath).isFile()) {
      continue;
    }

    const text = fs.readFileSync(filePath, "utf8");
    findings.push(...collectHardcodedPathFindings(filePath, text));
  }

  return findings;
}

function formatFinding(finding) {
  const relativePath = path.relative(process.cwd(), finding.filePath) || finding.filePath;
  return `${relativePath}:${finding.line}:${finding.column} ${finding.match}`;
}

function main() {
  const targets = process.argv.slice(2);
  const findings = runHardcodedPathAudit(targets.length > 0 ? targets : DEFAULT_TARGETS);

  if (findings.length === 0) {
    console.log("No hard-coded absolute paths found.");
    return;
  }

  console.log("Hard-coded path findings:");
  for (const finding of findings) {
    console.log(formatFinding(finding));
  }

  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
