import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "measure-layout.mjs");

async function main() {
  const { deriveDefaultOutputDir, deriveCaptureSlug } = await import(pathToFileURL(scriptPath).href);

  const rootDir = path.join("E:", "writing-system");

  assert.equal(
    deriveCaptureSlug("https://www.evidence.studio/connectors"),
    "evidence-studio-connectors"
  );

  assert.equal(
    deriveCaptureSlug("https://www.evidence.studio/explore?table=demo.daily_orders"),
    "evidence-studio-explore-table-demo-daily-orders"
  );

  const longUrl = `https://braintrust.dev/docs/evaluate/playgrounds?foo=${"x".repeat(220)}`;
  const longSlug = deriveCaptureSlug(longUrl);

  assert.equal(longSlug.length <= 120, true);
  assert.equal(longSlug.startsWith("braintrust-dev-docs-evaluate-playgrounds"), true);

  assert.equal(
    deriveCaptureSlug(path.join(rootDir, "docs", "fixtures", "sample-layout.html")),
    "sample-layout"
  );

  const defaultDir = deriveDefaultOutputDir({
    repoRoot: rootDir,
    targetUrl: "https://www.evidence.studio/explore?table=demo.daily_orders",
    width: 1920,
    height: 1080,
  });

  assert.equal(
    defaultDir,
    path.join(
      rootDir,
      "docs",
      "design-layouts",
      "evidence-studio-explore-table-demo-daily-orders",
      "1920x1080"
    )
  );

  const explicitDir = path.resolve(rootDir, "custom-output");
  const derivedJson = path.join(defaultDir, "report.json");
  const explicitJson = path.join(explicitDir, "report.json");

  assert.equal(derivedJson.endsWith(path.join("1920x1080", "report.json")), true);
  assert.equal(explicitJson, path.join(explicitDir, "report.json"));

  console.log("measure-layout check passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
