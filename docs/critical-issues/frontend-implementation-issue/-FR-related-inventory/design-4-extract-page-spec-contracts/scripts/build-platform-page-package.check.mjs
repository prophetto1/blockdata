import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "build-platform-page-package.mjs");
const inputPath = path.join(__dirname, "fixtures", "sample-page-captures.json");
const outputDir = path.join(__dirname, "..", "..", "..", "..", "output", "playwright", "platform-page-package-test");

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  const { buildPlatformPagePackage } = await import(pathToFileURL(scriptPath).href);
  const result = await buildPlatformPagePackage({
    inputPath,
    outputDir,
    requestedChanges: ["Replace brand assets and copy only."],
  });

  assert.ok(fs.existsSync(result.masterJsonPath), "expected master json");
  assert.ok(fs.existsSync(result.variantJsonPath), "expected variant json");
  assert.ok(fs.existsSync(result.contractPath), "expected contract markdown");

  const master = JSON.parse(fs.readFileSync(result.masterJsonPath, "utf8"));
  const contract = fs.readFileSync(result.contractPath, "utf8");

  assert.equal(master.pageId, "workspace-home");
  assert.equal(master.themeSupport, "dual");
  assert.equal(master.requiredThemes.day, true);
  assert.equal(master.requiredThemes.night, true);
  assert.deepEqual(master.viewportSet, ["desktop", "tablet", "mobile"]);
  assert.equal(master.shellVariant.slug, "workspace-home");
  assert.equal(master.componentInventory.card.desktop.day, 4);
  assert.match(contract, /# Platform Page Design Contract/);
  assert.match(contract, /One page only/);
  assert.match(contract, /Day and night tokens are both required/);
  assert.match(contract, /Replace brand assets and copy only\./);
  assert.match(contract, /Desktop shell max width: `1280px`/);

  console.log("build-platform-page-package check passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
