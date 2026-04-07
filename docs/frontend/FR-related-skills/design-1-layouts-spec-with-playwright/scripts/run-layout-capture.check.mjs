import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "run-layout-capture.mjs");

async function main() {
  const { buildRunLayoutCaptureConfig } = await import(pathToFileURL(scriptPath).href);
  const measureModule = await import(pathToFileURL(path.join(__dirname, "measure-layout.mjs")).href);

  const rootDir = path.join("E:", "writing-system");
  const defaultOutputDir = measureModule.deriveDefaultOutputDir({
    repoRoot: rootDir,
    targetUrl: "https://www.evidence.studio/connectors",
    width: 1920,
    height: 1080,
  });
  const defaultStatePath = measureModule.deriveAuthStatePath({
    repoRoot: rootDir,
    targetUrl: "https://www.evidence.studio/connectors",
  });

  const config = await buildRunLayoutCaptureConfig({
    url: "https://www.evidence.studio/connectors",
    width: "1920",
    height: "1080",
  });

  assert.equal(config.measureOptions.outputDir, defaultOutputDir);
  assert.equal(config.measureOptions.storageStatePath, defaultStatePath);
  assert.equal(config.resultMeta.outputDir, defaultOutputDir);
  assert.equal(config.resultMeta.storageStatePath, defaultStatePath);

  console.log("run-layout-capture check passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
