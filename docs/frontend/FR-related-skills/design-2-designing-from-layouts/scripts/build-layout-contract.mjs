import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

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

function readReport(reportPath) {
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

function asList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split("||")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPx(value) {
  if (value === null || value === undefined) {
    return "unknown";
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  return String(value);
}

function line(label, value) {
  return `- ${label}: ${value}`;
}

function renderSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return "- No section inventory available.";
  }

  return sections
    .map((section) => {
      const classLabel = section.className ? `.${section.className}` : "(no class)";
      const idLabel = section.id ? `#${section.id}` : "(no id)";
      return `- \`${section.tag}\` ${idLabel} ${classLabel} at \`${section.rect.width}x${section.rect.height}\` starting \`${section.rect.x},${section.rect.y}\``;
    })
    .join("\n");
}

function modeRules(mode) {
  if (mode === "parity") {
    return {
      heading: "Produce a visual and structural parity build.",
      allowance:
        "Only CI/BI swaps and explicit user-requested changes may differ from the measured reference.",
    };
  }

  return {
    heading: "Produce a near-identical build that preserves the reference implementation.",
    allowance:
      "All non-requested implementation details must remain identical to the measured reference, even in `similar` mode.",
  };
}

function buildMarkdown({ report, reportPath, mode, requestedChanges, liveReferenceUrl, outputPath }) {
  const rules = modeRules(mode);
  const viewport = report.capture?.viewport ?? {};
  const shell = report.measurements?.shell ?? {};
  const hero = report.measurements?.hero ?? {};
  const search = report.measurements?.search ?? {};
  const cards = report.measurements?.cards ?? {};
  const sections = report.measurements?.sections ?? [];
  const page = report.capture?.page ?? {};
  const artifacts = report.capture?.artifacts ?? {};

  const requestedSection =
    requestedChanges.length > 0
      ? requestedChanges.map((item) => `- ${item}`).join("\n")
      : "- No extra requested changes were supplied.";

  const liveReferenceSection = liveReferenceUrl
    ? `- Live reference checks are allowed at: \`${liveReferenceUrl}\`\n- Live reference use may only resolve missing facts. It may not widen the allowed changes.`
    : "- Use the live reference only if the frozen artifacts leave a factual gap.";

  return [
    "# Page Reproduction Contract",
    "",
    "## Source",
    "",
    line("Mode", `\`${mode}\``),
    line("Source page", `\`${page.url ?? "unknown"}\``),
    line("Page title", `\`${page.title ?? "unknown"}\``),
    line("Viewport", `\`${viewport.width}x${viewport.height}\``),
    line("Report path", `\`${reportPath}\``),
    line("Viewport screenshot", `\`${artifacts.viewportScreenshot ?? "unknown"}\``),
    line("Full-page screenshot", `\`${artifacts.fullPageScreenshot ?? "unknown"}\``),
    line("Output path", `\`${outputPath}\``),
    "",
    "## Required Result",
    "",
    `- ${rules.heading}`,
    `- ${rules.allowance}`,
    "- CI/BI swaps are allowed.",
    "- No other layout, spacing, hierarchy, or styling changes are allowed unless the user explicitly requests them.",
    "",
    "## Requested Changes",
    "",
    requestedSection,
    "",
    "## Fixed Layout Contract",
    "",
    line("Shell max width", `\`${toPx(shell.maxWidth)}\``),
    line("Shell horizontal padding", `\`${toPx(shell.paddingLeft)} / ${toPx(shell.paddingRight)}\``),
    line("Hero block", `\`${toPx(hero.width)} x ${toPx(hero.height)}\``),
    line(
      "Hero heading",
      `\`${hero.heading?.fontSize ?? "unknown"}\` / \`${hero.heading?.lineHeight ?? "unknown"}\` / weight \`${hero.heading?.fontWeight ?? "unknown"}\``
    ),
    line(
      "Hero paragraph",
      `\`${hero.paragraph?.fontSize ?? "unknown"}\` / \`${hero.paragraph?.lineHeight ?? "unknown"}\` / weight \`${hero.paragraph?.fontWeight ?? "unknown"}\``
    ),
    line("Search input", `\`${toPx(search.width)} x ${toPx(search.height)}\``),
    line("Search left padding", `\`${toPx(search.paddingLeft)}\``),
    line("Card count", `\`${cards.count ?? "unknown"}\``),
    line(
      "First card",
      `\`${toPx(cards.first?.width)} x ${toPx(cards.first?.height)} / radius ${cards.first?.radius ?? "unknown"}\``
    ),
    "",
    "## Section Inventory",
    "",
    renderSections(sections),
    "",
    "## Live Reference Rule",
    "",
    liveReferenceSection,
    "",
    "## Acceptance Rule",
    "",
    "- The designed page must reproduce the reference implementation.",
    "- If a choice is not explicitly permitted as a CI/BI swap or user-requested change, keep it identical to the reference.",
    "- Do not reinterpret `similar` as permission to redesign the page.",
    "",
  ].join("\n");
}

export async function buildLayoutContract(options) {
  const reportPath = path.resolve(options.reportPath ?? options["report-path"] ?? "");
  if (!reportPath) {
    throw new Error("Missing required --report-path argument.");
  }

  const mode = options.mode === "parity" ? "parity" : "similar";
  const outputPath = path.resolve(
    options.outputPath ??
      options["output-path"] ??
      path.join(path.dirname(reportPath), "page-reproduction-contract.md")
  );
  const report = readReport(reportPath);
  const requestedChanges = asList(options.requestedChanges ?? options["requested-changes"]);
  const liveReferenceUrl = options.liveReferenceUrl ?? options["live-reference-url"] ?? null;

  ensureDir(path.dirname(outputPath));
  const markdown = buildMarkdown({
    report,
    reportPath,
    mode,
    requestedChanges,
    liveReferenceUrl,
    outputPath,
  });

  fs.writeFileSync(outputPath, `${markdown}\n`, "utf8");
  return markdown;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const markdown = await buildLayoutContract(options);
  process.stdout.write(markdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
