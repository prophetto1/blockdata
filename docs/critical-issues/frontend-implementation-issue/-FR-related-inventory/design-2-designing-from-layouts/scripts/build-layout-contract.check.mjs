import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "build-layout-contract.mjs");
const reportPath = path.join(__dirname, "fixtures", "sample-report.json");
const outputDir = path.join(__dirname, "..", "..", "..", "..", "output", "playwright", "contract-test");
const contractPath = path.join(outputDir, "page-reproduction-contract.md");

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  const { buildLayoutContract } = await import(pathToFileURL(scriptPath).href);
  const markdown = await buildLayoutContract({
    reportPath,
    mode: "similar",
    outputPath: contractPath,
    requestedChanges: ["Replace brand copy and brand visuals only."],
  });

  assert.ok(fs.existsSync(contractPath), "expected markdown contract");
  assert.match(markdown, /# Page Reproduction Contract/);
  assert.match(markdown, /Mode: `similar`/);
  assert.match(markdown, /All non-requested implementation details must remain identical/);
  assert.match(markdown, /CI\/BI swaps/);
  assert.match(markdown, /Viewport: `1440x1024`/);
  assert.match(markdown, /Shell max width: `1280px`/);
  assert.match(markdown, /Hero heading: `72px` \/ `80px` \/ weight `400`/);
  assert.match(markdown, /Card count: `4`/);
  assert.match(markdown, /Replace brand copy and brand visuals only\./);

  console.log("build-layout-contract check passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
