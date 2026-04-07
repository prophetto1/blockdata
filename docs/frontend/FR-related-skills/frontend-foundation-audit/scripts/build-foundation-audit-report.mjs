import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
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

// --- Input validation ---

function validateInput(input) {
  const errors = [];

  // Required top-level fields
  if (!input.repoName) errors.push("Missing required field: repoName");
  if (!input.scope) errors.push("Missing required field: scope");
  if (!Array.isArray(input.shellOwnership)) errors.push("Missing or non-array: shellOwnership");
  if (!Array.isArray(input.tokenInventory)) errors.push("Missing or non-array: tokenInventory");
  if (!Array.isArray(input.componentContracts)) errors.push("Missing or non-array: componentContracts");
  if (!Array.isArray(input.pagePatterns)) errors.push("Missing or non-array: pagePatterns");
  if (!input.navigationStructure) errors.push("Missing required field: navigationStructure");
  if (!input.statePresentation) errors.push("Missing required field: statePresentation");
  if (!Array.isArray(input.conflictBundles)) errors.push("Missing or non-array: conflictBundles");
  if (!Array.isArray(input.cleanAreas)) errors.push("Missing or non-array: cleanAreas");

  // Scope requirements
  if (input.scope) {
    if (!Array.isArray(input.scope.majorDirectories) || input.scope.majorDirectories.length === 0) {
      errors.push("scope.majorDirectories must be a non-empty array");
    }
    if (!input.scope.surfaceAreaEstimate) {
      errors.push("scope.surfaceAreaEstimate is required");
    }
    if (!input.scope.samplingMode) {
      errors.push("scope.samplingMode is required ('full' or 'sampled')");
    }
    if (input.scope.samplingMode === "sampled" && !input.scope.samplingNotes) {
      errors.push("scope.samplingNotes is required when samplingMode is 'sampled'");
    }
  }

  // Emptiness guards -- a shallow audit that inventories nothing is not an audit
  const shellCount = input.shellOwnership?.length ?? 0;
  const tokenCount = input.tokenInventory?.length ?? 0;
  const componentCount = input.componentContracts?.length ?? 0;
  const pageCount = input.pagePatterns?.length ?? 0;
  const conflictCount = input.conflictBundles?.length ?? 0;
  const cleanCount = input.cleanAreas?.length ?? 0;

  if (shellCount === 0 && tokenCount === 0 && componentCount === 0 && pageCount === 0) {
    errors.push("Audit is empty: at least one of shellOwnership, tokenInventory, componentContracts, or pagePatterns must have entries");
  }
  if (conflictCount === 0 && cleanCount === 0) {
    errors.push("Audit has no resolution: at least one conflictBundle or cleanArea is required");
  }

  // Evidence requirements on inventory entries
  const checkEvidence = (arr, label) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((entry, i) => {
      if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
        const id = entry.region || entry.source || entry.role || entry.patternName || entry.area || `[${i}]`;
        errors.push(`${label} "${id}" has no evidence`);
      }
    });
  };

  checkEvidence(input.shellOwnership, "shellOwnership");
  checkEvidence(input.tokenInventory, "tokenInventory");
  checkEvidence(input.componentContracts, "componentContracts");
  checkEvidence(input.pagePatterns, "pagePatterns");
  checkEvidence(input.cleanAreas, "cleanAreas");

  // Navigation evidence
  if (input.navigationStructure && (!Array.isArray(input.navigationStructure.evidence) || input.navigationStructure.evidence.length === 0)) {
    errors.push("navigationStructure has no evidence");
  }

  // State presentation evidence
  if (input.statePresentation && (!Array.isArray(input.statePresentation.evidence) || input.statePresentation.evidence.length === 0)) {
    errors.push("statePresentation has no evidence");
  }

  // Conflict bundle structural requirements
  if (Array.isArray(input.conflictBundles)) {
    input.conflictBundles.forEach((bundle, i) => {
      const id = bundle.bundleName || `[${i}]`;
      if (!bundle.bundleName) errors.push(`conflictBundle ${id}: missing bundleName`);
      if (!bundle.roleUnderDispute) errors.push(`conflictBundle "${id}": missing roleUnderDispute`);
      if (!Array.isArray(bundle.competingImplementations) || bundle.competingImplementations.length < 2) {
        errors.push(`conflictBundle "${id}": must have at least 2 competingImplementations`);
      }
      if (!Array.isArray(bundle.evidence) || bundle.evidence.length === 0) {
        errors.push(`conflictBundle "${id}": has no evidence`);
      }
      if (!bundle.whyNoSingleContract) errors.push(`conflictBundle "${id}": missing whyNoSingleContract`);
      if (!bundle.recommendedDirection) errors.push(`conflictBundle "${id}": missing recommendedDirection`);
      if (!Array.isArray(bundle.discussionQuestions) || bundle.discussionQuestions.length === 0) {
        errors.push(`conflictBundle "${id}": must have at least 1 discussionQuestion`);
      }
      const validEffort = ["quick-win", "moderate", "architectural"];
      if (!bundle.effortLevel || !validEffort.includes(bundle.effortLevel)) {
        errors.push(`conflictBundle "${id}": effortLevel must be one of ${validEffort.join(", ")}`);
      }
    });
  }

  return errors;
}

// --- Report builder ---

function buildReport(input) {
  const shell = input.shellOwnership ?? [];
  const tokens = input.tokenInventory ?? [];
  const components = input.componentContracts ?? [];
  const pages = input.pagePatterns ?? [];
  const conflicts = input.conflictBundles ?? [];
  const clean = input.cleanAreas ?? [];

  return {
    ...input,
    auditDate: input.auditDate ?? new Date().toISOString().slice(0, 10),
    accessibilityNotes: input.accessibilityNotes ?? [],
    summary: {
      totalShellRegions: shell.length,
      totalTokenSources: tokens.length,
      totalComponentRoles: components.length,
      totalPagePatterns: pages.length,
      totalConflictBundles: conflicts.length,
      totalQuickWins: conflicts.filter((c) => c.effortLevel === "quick-win").length,
      totalCleanAreas: clean.length,
      samplingMode: input.scope?.samplingMode ?? "full",
    },
  };
}

// --- Markdown renderer ---

function arr(value) {
  if (!value || value.length === 0) return "--";
  return value.join(", ");
}

function yn(value) {
  return value ? "yes" : "no";
}

function nullable(value) {
  return value ?? "--";
}

function renderEvidence(evidence) {
  if (!evidence || evidence.length === 0) return "";
  return evidence.map((e) => `- [evidence] ${e}`).join("\n");
}

function renderShellTable(entries) {
  if (!entries.length) return "No shell regions recorded.";
  const rows = entries.map(
    (e) =>
      `| ${e.region} | ${arr(e.ownerFiles)} | ${e.runtimeRole} | ${nullable(e.stateOwner)} | ${e.clarityRating} |`
  );
  const notes = entries.filter((e) => e.notes);
  let out = [
    "| Region | Owner File(s) | Runtime Role | State Owner | Clarity |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n");
  if (notes.length) {
    out += "\n\n### Shell Notes\n\n";
    out += notes.map((e) => `- **${e.region}:** ${e.notes}`).join("\n");
  }
  return out;
}

function renderTokenTable(entries) {
  if (!entries.length) return "No token sources recorded.";
  const rows = entries.map(
    (e) =>
      `| ${e.source} | ${arr(e.files)} | ${yn(e.semanticTokensPresent)} | ${yn(e.rawValuesPresent)} | ${e.lightCoverage} | ${e.darkCoverage} | ${nullable(e.driftNotes)} |`
  );
  return [
    "| Source | File(s) | Semantic | Raw Values | Light | Dark | Drift Notes |",
    "|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function renderComponentTable(entries) {
  if (!entries.length) return "No component roles recorded.";
  const rows = entries.map(
    (e) =>
      `| ${e.role} | ${arr(e.canonicalCandidates)} | ${arr(e.competingImplementations)} | ${arr(e.ownerFiles)} | ${arr(e.visibleStateCoverage)} |`
  );
  return [
    "| Role | Canonical Candidate(s) | Competing | Owner File(s) | State Coverage |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function renderPagePatternTable(entries) {
  if (!entries.length) return "No page patterns recorded.";
  const rows = entries.map(
    (e) =>
      `| ${e.patternName} | ${e.strongestExample} | ${arr(e.competingExamples)} | ${nullable(e.structureNotes)} |`
  );
  return [
    "| Pattern | Strongest Example | Competing Examples | Structure Notes |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function renderNavigation(nav) {
  if (!nav) return "No navigation structure recorded.";
  const sections = [];

  sections.push("### Primary Navigation");
  sections.push(nav.primaryOwners?.length ? arr(nav.primaryOwners) : "None identified.");

  sections.push("\n### Secondary Navigation");
  sections.push(nav.secondaryOwners?.length ? arr(nav.secondaryOwners) : "None identified.");

  sections.push("\n### Route Mapping");
  sections.push(nullable(nav.routeMapping));

  sections.push("\n### Breadcrumb Conventions");
  sections.push(nullable(nav.breadcrumbConventions));

  sections.push("\n### Action Placement");
  sections.push(nullable(nav.actionPlacement));

  if (nav.evidence?.length) {
    sections.push("");
    sections.push(renderEvidence(nav.evidence));
  }

  return sections.join("\n");
}

function renderStatePresentation(state) {
  if (!state) return "No state presentation recorded.";
  const types = [
    ["Loading", state.loading],
    ["Empty", state.empty],
    ["Error", state.error],
    ["Success", state.success],
    ["Permission", state.permission],
    ["Async / Polling", state.async],
  ];
  const sections = types.map(
    ([name, value]) => `### ${name}\n\n${value ?? "No pattern identified."}`
  );
  if (state.evidence?.length) {
    sections.push(renderEvidence(state.evidence));
  }
  return sections.join("\n\n");
}

function renderConflictBundle(bundle) {
  const lines = [];
  lines.push(`### Bundle: ${bundle.bundleName}`);
  lines.push("");
  lines.push(`**Role under dispute:** ${bundle.roleUnderDispute}`);
  lines.push("");
  const effortStr = bundle.effortLevel ?? "unspecified";
  const filesStr = bundle.estimatedFiles != null ? ` (~${bundle.estimatedFiles} files)` : "";
  lines.push(`**Effort level:** ${effortStr}${filesStr}`);
  lines.push("");
  lines.push("**Competing implementations:**");
  bundle.competingImplementations.forEach((impl, i) => {
    lines.push(`${i + 1}. **${impl.name}** (${impl.location}) -- ${impl.whatItSolves}`);
  });
  lines.push("");
  lines.push("**Evidence:**");
  lines.push(renderEvidence(bundle.evidence));
  lines.push("");
  lines.push(`**Why no single contract exists:** ${bundle.whyNoSingleContract}`);
  lines.push("");
  lines.push(`**Recommended direction:** ${bundle.recommendedDirection}`);
  lines.push("");
  lines.push("**Discussion questions:**");
  bundle.discussionQuestions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q}`);
  });
  return lines.join("\n");
}

function renderCleanArea(area) {
  const lines = [];
  lines.push(`### ${area.area}`);
  lines.push("");
  lines.push(area.summary);
  if (area.evidence?.length) {
    lines.push("");
    lines.push(renderEvidence(area.evidence));
  }
  return lines.join("\n");
}

function buildMarkdown(report) {
  const scope = report.scope ?? {};
  const s = report.summary;

  const sections = [];

  // Title
  sections.push("# Frontend Foundation Audit Report");

  // Summary
  sections.push("## Summary");
  sections.push(
    [
      "| Metric | Value |",
      "|---|---|",
      `| Shell regions | ${s.totalShellRegions} |`,
      `| Token sources | ${s.totalTokenSources} |`,
      `| Component roles | ${s.totalComponentRoles} |`,
      `| Page patterns | ${s.totalPagePatterns} |`,
      `| Conflict bundles | ${s.totalConflictBundles} |`,
      `| Quick wins | ${s.totalQuickWins} |`,
      `| Clean areas | ${s.totalCleanAreas} |`,
      `| Sampling mode | ${s.samplingMode} |`,
    ].join("\n")
  );

  // Scope
  sections.push("## Scope");
  sections.push(
    [
      `- Repo: \`${report.repoName}\``,
      `- Audit date: ${report.auditDate}`,
      `- Captures reviewed: ${scope.capturesReviewed?.length ? scope.capturesReviewed.map((c) => `\`${c}\``).join(", ") : "none"}`,
      `- Token files reviewed: ${scope.tokenFilesReviewed?.length ? scope.tokenFilesReviewed.map((f) => `\`${f}\``).join(", ") : "none"}`,
      `- Major directories: ${arr(scope.majorDirectories)}`,
      `- Exclusions: ${scope.exclusions?.length ? arr(scope.exclusions) : "none"}`,
      `- Surface area: ${scope.surfaceAreaEstimate ? `${scope.surfaceAreaEstimate.shellFiles} shell, ${scope.surfaceAreaEstimate.tokenFiles} token, ${scope.surfaceAreaEstimate.sharedComponents} shared components, ${scope.surfaceAreaEstimate.pageFiles} pages` : "not estimated"}`,
      `- Sampling: ${scope.samplingMode ?? "full"}${scope.samplingNotes ? ` -- ${scope.samplingNotes}` : ""}`,
    ].join("\n")
  );

  // Shell
  sections.push("## Shell Ownership Map");
  sections.push(renderShellTable(report.shellOwnership ?? []));

  // Navigation
  sections.push("## Navigation and Rail Structure");
  sections.push(renderNavigation(report.navigationStructure));

  // Tokens
  sections.push("## Token and Theme Inventory");
  sections.push(renderTokenTable(report.tokenInventory ?? []));

  // Components
  sections.push("## Component Contract Inventory");
  sections.push(renderComponentTable(report.componentContracts ?? []));

  // Page patterns
  sections.push("## Page Pattern Inventory");
  sections.push(renderPagePatternTable(report.pagePatterns ?? []));

  // State presentation
  sections.push("## State-Presentation Inventory");
  sections.push(renderStatePresentation(report.statePresentation));

  // Accessibility
  sections.push("## Accessibility and Mode-Consistency Notes");
  const a11y = report.accessibilityNotes ?? [];
  sections.push(a11y.length ? a11y.map((n) => `- ${n}`).join("\n") : "No accessibility notes recorded.");

  // Quick wins
  sections.push("## Quick Wins");
  const bundles = report.conflictBundles ?? [];
  const quickWins = bundles
    .filter((b) => b.effortLevel === "quick-win")
    .sort((a, b) => (a.estimatedFiles ?? Infinity) - (b.estimatedFiles ?? Infinity));
  if (quickWins.length) {
    const qwRows = quickWins.map(
      (b) =>
        `| ${b.bundleName} | ${b.roleUnderDispute} | ${b.estimatedFiles ?? "--"} | ${b.recommendedDirection.split(".")[0]}. |`
    );
    sections.push(
      [
        "| Bundle | Role | Est. Files | Recommended Direction |",
        "|---|---|---|---|",
        ...qwRows,
      ].join("\n")
    );
  } else {
    sections.push("No quick wins identified.");
  }

  // Conflict bundles
  sections.push("## Conflict Bundles");
  if (bundles.length) {
    sections.push(bundles.map(renderConflictBundle).join("\n\n"));
  } else {
    sections.push("No conflict bundles identified.");
  }

  // Clean areas
  sections.push("## Clean Areas");
  const clean = report.cleanAreas ?? [];
  if (clean.length) {
    sections.push(clean.map(renderCleanArea).join("\n\n"));
  } else {
    sections.push("No clean areas identified -- all audited areas have conflicts.");
  }

  // Recommended directions
  sections.push("## Recommended Directions");
  if (bundles.length) {
    sections.push(
      bundles
        .map((b, i) => `${i + 1}. **${b.bundleName}:** ${b.recommendedDirection}`)
        .join("\n")
    );
  } else {
    sections.push("No recommendations -- no conflict bundles identified.");
  }

  // Unresolved decisions
  sections.push("## Unresolved Decisions");
  const allQuestions = bundles.flatMap((b) =>
    b.discussionQuestions.map((q) => `${q} *(from: ${b.bundleName})*`)
  );
  if (allQuestions.length) {
    sections.push(allQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"));
  } else {
    sections.push("No unresolved decisions.");
  }

  // Next artifact
  sections.push("## Suggested Next Artifact");
  sections.push(
    "The next artifact should be the canonical frontend foundation contract, derived from this audit and the resolved discussion decisions."
  );

  return sections.join("\n\n") + "\n";
}

// --- Entry point ---

export async function buildFoundationAuditReport(options) {
  const inputPath = path.resolve(
    options.inputPath ?? options["input-path"] ?? ""
  );
  if (!inputPath) {
    throw new Error("Missing required --input-path argument.");
  }

  const outputDir = path.resolve(
    options.outputDir ??
      options["output-dir"] ??
      path.join(path.dirname(inputPath), "foundation-audit-report")
  );
  ensureDir(outputDir);

  const input = readJson(inputPath);

  const validationErrors = validateInput(input);
  if (validationErrors.length > 0) {
    throw new Error(
      `Audit input validation failed (${validationErrors.length} error${validationErrors.length === 1 ? "" : "s"}):\n` +
        validationErrors.map((e) => `  - ${e}`).join("\n")
    );
  }

  const report = buildReport(input);

  const jsonPath = path.join(outputDir, "foundation-audit.json");
  const markdownPath = path.join(outputDir, "foundation-audit.md");

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, buildMarkdown(report), "utf8");

  return { jsonPath, markdownPath };
}

// --- CLI ---

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await buildFoundationAuditReport(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
