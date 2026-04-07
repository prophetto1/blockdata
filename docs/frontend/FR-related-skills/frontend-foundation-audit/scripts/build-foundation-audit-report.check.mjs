import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, "build-foundation-audit-report.mjs");
const inputPath = path.join(__dirname, "fixtures", "sample-foundation-audit-input.json");
const outputDir = path.join(__dirname, "..", "..", "..", "..", "output", "foundation-audit-test");

async function main() {
  fs.rmSync(outputDir, { recursive: true, force: true });

  const { buildFoundationAuditReport } = await import(
    pathToFileURL(scriptPath).href
  );
  const result = await buildFoundationAuditReport({ inputPath, outputDir });

  // Files exist
  assert.ok(fs.existsSync(result.jsonPath), "expected audit json");
  assert.ok(fs.existsSync(result.markdownPath), "expected audit markdown");

  // JSON report shape
  const report = JSON.parse(fs.readFileSync(result.jsonPath, "utf8"));
  assert.equal(report.repoName, "example-app");
  assert.equal(report.auditDate, "2026-04-04");
  assert.equal(report.summary.totalShellRegions, 3);
  assert.equal(report.summary.totalTokenSources, 3);
  assert.equal(report.summary.totalComponentRoles, 2);
  assert.equal(report.summary.totalPagePatterns, 2);
  assert.equal(report.summary.totalConflictBundles, 2);
  assert.equal(report.summary.totalCleanAreas, 2);
  assert.equal(report.summary.samplingMode, "full");

  // Shell entries preserved
  assert.equal(report.shellOwnership.length, 3);
  assert.equal(report.shellOwnership[1].clarityRating, "conflicting");

  // Conflict bundles preserved
  assert.equal(report.conflictBundles[0].bundleName, "left-rail-ownership");
  assert.equal(report.conflictBundles[0].competingImplementations.length, 2);
  assert.equal(report.conflictBundles[1].bundleName, "token-source-fragmentation");
  assert.equal(report.conflictBundles[1].competingImplementations.length, 3);

  // Clean areas preserved
  assert.equal(report.cleanAreas[0].area, "page-header");

  // Markdown structure
  const markdown = fs.readFileSync(result.markdownPath, "utf8");
  assert.match(markdown, /# Frontend Foundation Audit Report/);
  assert.match(markdown, /## Summary/);
  assert.match(markdown, /## Scope/);
  assert.match(markdown, /## Shell Ownership Map/);
  assert.match(markdown, /## Navigation and Rail Structure/);
  assert.match(markdown, /## Token and Theme Inventory/);
  assert.match(markdown, /## Component Contract Inventory/);
  assert.match(markdown, /## Page Pattern Inventory/);
  assert.match(markdown, /## State-Presentation Inventory/);
  assert.match(markdown, /## Accessibility and Mode-Consistency Notes/);
  assert.match(markdown, /## Conflict Bundles/);
  assert.match(markdown, /## Clean Areas/);
  assert.match(markdown, /## Recommended Directions/);
  assert.match(markdown, /## Unresolved Decisions/);
  assert.match(markdown, /## Suggested Next Artifact/);

  // Evidence linking convention
  assert.match(markdown, /\[evidence\]/);

  // Conflict bundle content
  assert.match(markdown, /Bundle: left-rail-ownership/);
  assert.match(markdown, /Bundle: token-source-fragmentation/);
  assert.match(markdown, /Role under dispute/);
  assert.match(markdown, /Competing implementations/);
  assert.match(markdown, /Discussion questions/);

  // Clean area content
  assert.match(markdown, /### page-header/);

  // Shell notes rendered for conflicting region
  assert.match(markdown, /Shell Notes/);

  // Summary table
  assert.match(markdown, /Shell regions \| 3/);
  assert.match(markdown, /Conflict bundles \| 2/);
  assert.match(markdown, /Sampling mode \| full/);

  // Scope section
  assert.match(markdown, /Repo: `example-app`/);

  console.log("happy-path check passed");

  // --- Rejection tests ---

  // Reject empty object
  await assertRejects(
    buildFoundationAuditReport,
    {},
    "Missing required field: repoName",
    "rejects empty input"
  );

  // Reject empty inventories (shallow audit)
  await assertRejects(
    buildFoundationAuditReport,
    {
      repoName: "test",
      scope: { majorDirectories: ["src"], surfaceAreaEstimate: { shellFiles: 0, tokenFiles: 0, sharedComponents: 0, pageFiles: 0 }, samplingMode: "full" },
      shellOwnership: [],
      tokenInventory: [],
      componentContracts: [],
      pagePatterns: [],
      navigationStructure: { primaryOwners: [], secondaryOwners: [], evidence: ["some"] },
      statePresentation: { evidence: ["some"] },
      conflictBundles: [],
      cleanAreas: [],
    },
    "Audit is empty",
    "rejects empty inventories"
  );

  // Reject missing evidence on shell entry
  await assertRejects(
    buildFoundationAuditReport,
    {
      repoName: "test",
      scope: { majorDirectories: ["src"], surfaceAreaEstimate: { shellFiles: 1, tokenFiles: 0, sharedComponents: 0, pageFiles: 0 }, samplingMode: "full" },
      shellOwnership: [{ region: "header", ownerFiles: ["a.tsx"], runtimeRole: "header", clarityRating: "clear", evidence: [] }],
      tokenInventory: [],
      componentContracts: [],
      pagePatterns: [],
      navigationStructure: { primaryOwners: [], secondaryOwners: [], evidence: ["x"] },
      statePresentation: { evidence: ["x"] },
      conflictBundles: [],
      cleanAreas: [{ area: "header", summary: "clean", evidence: ["x"] }],
    },
    'shellOwnership "header" has no evidence',
    "rejects missing evidence on shell entry"
  );

  // Reject conflict bundle with only 1 competing implementation
  await assertRejects(
    buildFoundationAuditReport,
    {
      repoName: "test",
      scope: { majorDirectories: ["src"], surfaceAreaEstimate: { shellFiles: 1, tokenFiles: 0, sharedComponents: 0, pageFiles: 0 }, samplingMode: "full" },
      shellOwnership: [{ region: "header", ownerFiles: ["a.tsx"], runtimeRole: "header", clarityRating: "clear", evidence: ["x"] }],
      tokenInventory: [],
      componentContracts: [],
      pagePatterns: [],
      navigationStructure: { primaryOwners: [], secondaryOwners: [], evidence: ["x"] },
      statePresentation: { evidence: ["x"] },
      conflictBundles: [{
        bundleName: "bad-bundle",
        roleUnderDispute: "something",
        competingImplementations: [{ name: "only-one", location: "a.tsx", whatItSolves: "x" }],
        evidence: ["x"],
        whyNoSingleContract: "reason",
        recommendedDirection: "direction",
        discussionQuestions: ["q?"],
      }],
      cleanAreas: [],
    },
    "must have at least 2 competingImplementations",
    "rejects conflict bundle with < 2 implementations"
  );

  // Reject conflict bundle with no discussion questions
  await assertRejects(
    buildFoundationAuditReport,
    {
      repoName: "test",
      scope: { majorDirectories: ["src"], surfaceAreaEstimate: { shellFiles: 1, tokenFiles: 0, sharedComponents: 0, pageFiles: 0 }, samplingMode: "full" },
      shellOwnership: [{ region: "header", ownerFiles: ["a.tsx"], runtimeRole: "header", clarityRating: "clear", evidence: ["x"] }],
      tokenInventory: [],
      componentContracts: [],
      pagePatterns: [],
      navigationStructure: { primaryOwners: [], secondaryOwners: [], evidence: ["x"] },
      statePresentation: { evidence: ["x"] },
      conflictBundles: [{
        bundleName: "no-questions",
        roleUnderDispute: "something",
        competingImplementations: [{ name: "a", location: "a.tsx", whatItSolves: "x" }, { name: "b", location: "b.tsx", whatItSolves: "y" }],
        evidence: ["x"],
        whyNoSingleContract: "reason",
        recommendedDirection: "direction",
        discussionQuestions: [],
      }],
      cleanAreas: [],
    },
    "must have at least 1 discussionQuestion",
    "rejects conflict bundle with no discussion questions"
  );

  // Reject sampled mode without sampling notes
  await assertRejects(
    buildFoundationAuditReport,
    {
      repoName: "test",
      scope: { majorDirectories: ["src"], surfaceAreaEstimate: { shellFiles: 1, tokenFiles: 0, sharedComponents: 0, pageFiles: 0 }, samplingMode: "sampled" },
      shellOwnership: [{ region: "header", ownerFiles: ["a.tsx"], runtimeRole: "header", clarityRating: "clear", evidence: ["x"] }],
      tokenInventory: [],
      componentContracts: [],
      pagePatterns: [],
      navigationStructure: { primaryOwners: [], secondaryOwners: [], evidence: ["x"] },
      statePresentation: { evidence: ["x"] },
      conflictBundles: [],
      cleanAreas: [{ area: "header", summary: "clean", evidence: ["x"] }],
    },
    "samplingNotes is required when samplingMode is 'sampled'",
    "rejects sampled mode without notes"
  );

  console.log("rejection tests passed");
  console.log("all checks passed");
}

async function assertRejects(buildFn, input, expectedMessage, label) {
  const tmpDir = path.join(outputDir, "rejection-tmp");
  const tmpInput = path.join(tmpDir, "input.json");
  const tmpOutput = path.join(tmpDir, "output");
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(tmpInput, JSON.stringify(input), "utf8");
  try {
    await buildFn({ inputPath: tmpInput, outputDir: tmpOutput });
    assert.fail(`${label}: expected rejection but succeeded`);
  } catch (err) {
    if (err.code === "ERR_ASSERTION") throw err;
    assert.ok(
      err.message.includes(expectedMessage),
      `${label}: expected error containing "${expectedMessage}" but got: ${err.message}`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
