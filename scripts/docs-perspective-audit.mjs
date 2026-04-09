import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const TEXT_EXTENSIONS = new Set([".md", ".mdx", ".txt"]);
const DEFAULT_TARGETS = ["__start-here", "docs", "README.md", "AGENTS.md", "CLAUDE.md"];

const PATTERN_DEFINITIONS = [
  {
    name: "machine-reference",
    regex: /\b(?:my|this|that) (?:PC|machine|computer|laptop|host)\b/gi,
  },
  {
    name: "repo-reference",
    regex: /\bour (?:repo|repository)\b/gi,
  },
  {
    name: "first-person-action",
    regex: /\bI (?:use|run)\b/gi,
  },
];

export function stripMarkdownCodeFences(text) {
  const lines = text.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = null;

  return lines
    .map((line) => {
      const trimmed = line.trimStart();
      const fenceMatch = trimmed.match(/^(```+|~~~+)/);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        if (!inFence) {
          inFence = true;
          fenceMarker = marker;
          return "";
        }

        if (marker === fenceMarker) {
          inFence = false;
          fenceMarker = null;
          return "";
        }
      }

      return inFence ? "" : line;
    })
    .join("\n");
}

export function collectPerspectiveFindings(filePath, text) {
  const cleaned = stripMarkdownCodeFences(text);
  const findings = [];

  cleaned.split("\n").forEach((lineText, index) => {
    for (const { name, regex } of PATTERN_DEFINITIONS) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        findings.push({
          filePath,
          line: index + 1,
          column: match.index + 1,
          match: match[0],
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
    if (entry.name === ".git" || entry.name === "node_modules") {
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

export function runPerspectiveAudit(targets = DEFAULT_TARGETS) {
  const files = collectUniqueFiles(targets);
  const findings = [];

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    findings.push(...collectPerspectiveFindings(filePath, text));
  }

  return findings;
}

function formatFinding(finding) {
  const relativePath = path.relative(process.cwd(), finding.filePath) || finding.filePath;
  return `${relativePath}:${finding.line}:${finding.column} ${finding.match}`;
}

function main() {
  const targets = process.argv.slice(2);
  const findings = runPerspectiveAudit(targets.length > 0 ? targets : DEFAULT_TARGETS);

  if (findings.length === 0) {
    console.log("No first-person or deictic machine references found.");
    return;
  }

  console.log("Perspective findings:");
  for (const finding of findings) {
    console.log(formatFinding(finding));
  }

  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
