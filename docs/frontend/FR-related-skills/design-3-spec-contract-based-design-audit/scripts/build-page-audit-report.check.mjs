import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "build-page-audit-report.mjs");
const inputPath = path.join(__dirname, "fixtures", "sample-page-audit-input.json");
const outputDir = path.join(__dirname, "..", "..", "..", "..", "output", "playwright", "page-audit-test");

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  const { buildPageAuditReport } = await import(pathToFileURL(scriptPath).href);
  const result = await buildPageAuditReport({
    inputPath,
    outputDir,
  });

  assert.ok(fs.existsSync(result.jsonPath), "expected audit json");
  assert.ok(fs.existsSync(result.markdownPath), "expected audit markdown");

  const report = JSON.parse(fs.readFileSync(result.jsonPath, "utf8"));
  const markdown = fs.readFileSync(result.markdownPath, "utf8");

  assert.equal(report.pageId, "workspace-home");
  assert.equal(report.specRoot, "E:\\writing-system\\web-docs\\specs");
  assert.equal(report.summary.sourceViolations, 2);
  assert.equal(report.summary.renderedViolations, 2);
  assert.equal(report.summary.fixesApplied, 4);
  assert.match(markdown, /# Page Contract Audit Report/);
  assert.match(markdown, /Source path: `E:\\writing-system\\web\\src\\pages\\workspace\\WorkspaceHomePage.tsx`/);
  assert.match(markdown, /Dev URL: `http:\/\/127.0.0.1:4173\/workspace`/);
  assert.match(markdown, /Report inconsistencies and fix them/);
  assert.match(markdown, /Ark UI/);
  assert.match(markdown, /Verification status: source `pass`, rendered `pass`/);

  console.log("build-page-audit-report check passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
