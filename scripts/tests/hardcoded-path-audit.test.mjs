import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  collectHardcodedPathFindings,
  runHardcodedPathAudit,
} from "../hardcoded-path-audit.mjs";

test("collectHardcodedPathFindings finds Windows drive and UNC paths", () => {
  const findings = collectHardcodedPathFindings(
    "C:/docs/sample.md",
    [
      "Primary repo path: E:\\writing-system",
      "Network mirror: \\\\BUDDY\\writing-system\\docs",
      "Relative paths should not count: docs\\index.md",
    ].join("\n"),
  );

  assert.deepEqual(
    findings.map(({ match, line }) => ({ match, line })),
    [
      { match: "E:\\writing-system", line: 1 },
      { match: "\\\\BUDDY\\writing-system\\docs", line: 2 },
    ],
  );
});

test("collectHardcodedPathFindings trims markdown wrappers and trailing punctuation", () => {
  const findings = collectHardcodedPathFindings(
    "C:/docs/sample.md",
    [
      "Primary repo path: `E:\\writing-system` on JON.",
      "Config file (`C:\\Users\\jwchu\\.claude.json`).",
    ].join("\n"),
  );

  assert.deepEqual(
    findings.map(({ match, line }) => ({ match, line })),
    [
      { match: "E:\\writing-system", line: 1 },
      { match: "C:\\Users\\jwchu\\.claude.json", line: 2 },
    ],
  );
});

test("runHardcodedPathAudit dedupes overlapping file and directory targets", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "hardcoded-path-audit-"));
  const docsDir = path.join(tempDir, "docs");
  const filePath = path.join(docsDir, "note.md");

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(filePath, "Configured path: E:\\writing-system\n", "utf8");

  const findings = runHardcodedPathAudit([docsDir, filePath]);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].match, "E:\\writing-system");
});
