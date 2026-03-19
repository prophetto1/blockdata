import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "measure-layout.mjs");
const fixturePath = path.join(__dirname, "fixtures", "sample-layout.html");
const outputDir = path.join(__dirname, "..", "..", "..", "..", "output", "playwright", "skill-test");
const jsonPath = path.join(outputDir, "report.json");

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });

  const { measureLayout } = await import(pathToFileURL(scriptPath).href);
  const report = await measureLayout({
    url: fixturePath,
    width: 1440,
    height: 1024,
    outputDir,
    jsonOut: jsonPath,
  });

  assert.ok(fs.existsSync(jsonPath), "expected JSON report");
  assert.equal(report.capture.viewport.width, 1440);
  assert.equal(report.capture.viewport.height, 1024);
  assert.equal(report.capture.page.title, "Sample Layout");
  assert.equal(report.measurements.shell.maxWidth, 1280);
  assert.equal(report.measurements.hero.heading.fontSize, "72px");
  assert.equal(report.measurements.search.width, 280);
  assert.equal(report.measurements.cards.count, 4);
  assert.equal(report.measurements.cards.first.radius, "12px");

  console.log("measure-layout check passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
