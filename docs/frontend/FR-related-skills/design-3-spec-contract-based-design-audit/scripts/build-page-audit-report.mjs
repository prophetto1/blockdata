import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      index += 1;
    } else {
      options[key] = true;
    }
  }

  return options;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function countViolations(findings) {
  return findings.filter((finding) => finding.status === "violation").length;
}

function renderFindingList(findings) {
  if (!findings.length) {
    return "- No findings recorded.";
  }

  return findings
    .map((finding) => `- [${finding.status}] ${finding.area}: ${finding.detail}`)
    .join("\n");
}

function renderFixes(fixes) {
  if (!fixes.length) {
    return "- No fixes recorded.";
  }

  return fixes.map((fix) => `- ${fix}`).join("\n");
}

function buildReport(input) {
  const sourceViolations = countViolations(input.sourceFindings ?? []);
  const renderedViolations = countViolations(input.renderedFindings ?? []);
  const fixesApplied = (input.fixesApplied ?? []).length;

  return {
    pageId: input.pageId,
    sourcePath: input.sourcePath,
    devUrl: input.devUrl,
    specRoot: input.specRoot,
    specRefs: input.specRefs ?? [],
    summary: {
      sourceViolations,
      renderedViolations,
      fixesApplied,
      sourceRecheck: input.verification?.sourceRecheck ?? "unknown",
      renderedRecheck: input.verification?.renderedRecheck ?? "unknown",
    },
    sourceFindings: input.sourceFindings ?? [],
    renderedFindings: input.renderedFindings ?? [],
    fixesApplied: input.fixesApplied ?? [],
  };
}

function buildMarkdown(report) {
  return [
    "# Page Contract Audit Report",
    "",
    "## Scope",
    "",
    `- Page ID: \`${report.pageId}\``,
    `- Source path: \`${report.sourcePath}\``,
    `- Dev URL: \`${report.devUrl}\``,
    `- Spec root: \`${report.specRoot}\``,
    `- Spec references: \`${report.specRefs.join("`, `")}\``,
    "",
    "## Required Behavior",
    "",
    "- Report inconsistencies and fix them.",
    "- Run source audit first, then rendered verification.",
    "- Respect the canonized specs before making component or token substitutions.",
    "- If the specs require an Ark UI mapping, using raw HTML or the wrong library is a violation.",
    "",
    "## Summary",
    "",
    `- Source violations: \`${report.summary.sourceViolations}\``,
    `- Rendered violations: \`${report.summary.renderedViolations}\``,
    `- Fixes applied: \`${report.summary.fixesApplied}\``,
    `- Verification status: source \`${report.summary.sourceRecheck}\`, rendered \`${report.summary.renderedRecheck}\``,
    "",
    "## Source Findings",
    "",
    renderFindingList(report.sourceFindings),
    "",
    "## Rendered Findings",
    "",
    renderFindingList(report.renderedFindings),
    "",
    "## Fixes Applied",
    "",
    renderFixes(report.fixesApplied),
    "",
  ].join("\n");
}

export async function buildPageAuditReport(options) {
  const inputPath = path.resolve(options.inputPath ?? options["input-path"] ?? "");
  if (!inputPath) {
    throw new Error("Missing required --input-path argument.");
  }

  const outputDir = path.resolve(
    options.outputDir ?? options["output-dir"] ?? path.join(path.dirname(inputPath), "page-audit-report")
  );
  ensureDir(outputDir);

  const input = readJson(inputPath);
  const report = buildReport(input);

  const jsonPath = path.join(outputDir, "page-contract-audit.json");
  const markdownPath = path.join(outputDir, "page-contract-audit.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, `${buildMarkdown(report)}\n`, "utf8");

  return {
    jsonPath,
    markdownPath,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await buildPageAuditReport(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
