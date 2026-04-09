import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  collectPerspectiveFindings,
  runPerspectiveAudit,
  stripMarkdownCodeFences,
} from "../docs-perspective-audit.mjs";

test("stripMarkdownCodeFences removes fenced code blocks but keeps prose", () => {
  const input = [
    "This machine should be flagged.",
    "```yaml",
    "this machine should not be flagged inside code",
    "```",
    "Our repo should be flagged.",
  ].join("\n");

  const output = stripMarkdownCodeFences(input);

  assert.match(output, /This machine should be flagged\./);
  assert.match(output, /Our repo should be flagged\./);
  assert.doesNotMatch(output, /inside code/);
});

test("collectPerspectiveFindings flags first-person machine references in prose", () => {
  const findings = collectPerspectiveFindings(
    "C:/docs/sample.md",
    [
      "This machine is on the buddy side.",
      "I run the sync from here.",
      "```",
      "our repo inside a code block should not count",
      "```",
    ].join("\n"),
  );

  assert.deepEqual(
    findings.map(({ match, line }) => ({ match, line })),
    [
      { match: "This machine", line: 1 },
      { match: "I run", line: 2 },
    ],
  );
});

test("runPerspectiveAudit dedupes overlapping file and directory targets", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "docs-perspective-audit-"));
  const docsDir = path.join(tempDir, "docs");
  const filePath = path.join(docsDir, "note.md");

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(filePath, "This machine should only be reported once.\n", "utf8");

  const findings = runPerspectiveAudit([docsDir, filePath]);

  assert.equal(findings.length, 1);
  assert.equal(findings[0].match, "This machine");
});
