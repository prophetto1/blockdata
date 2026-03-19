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

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function indexCaptures(captures) {
  const byViewport = {};
  const byTheme = {};

  for (const capture of captures) {
    byViewport[capture.viewportName] ??= {};
    byViewport[capture.viewportName][capture.theme] = capture;

    byTheme[capture.theme] ??= [];
    byTheme[capture.theme].push(capture);
  }

  return { byViewport, byTheme };
}

function buildThemeRequirements(captures, themeSupport) {
  const availableThemes = uniqueStrings(captures.map((capture) => capture.theme));
  return {
    available: availableThemes,
    day: availableThemes.includes("day"),
    night: themeSupport === "dual" ? availableThemes.includes("night") : false,
  };
}

function buildBreakpointMatrix(captures) {
  return captures.map((capture) => ({
    viewportName: capture.viewportName,
    width: capture.width,
    height: capture.height,
    theme: capture.theme,
    shell: capture.shell,
  }));
}

function buildTypographyScale(captures) {
  const entries = [];
  for (const capture of captures) {
    for (const [role, value] of Object.entries(capture.typography ?? {})) {
      entries.push({
        role,
        viewportName: capture.viewportName,
        theme: capture.theme,
        ...value,
      });
    }
  }
  return entries;
}

function buildSpacingScale(captures) {
  return uniqueStrings(captures.flatMap((capture) => capture.spacingScale ?? []));
}

function buildThemeTokens(captures) {
  const output = {};
  for (const capture of captures) {
    output[capture.theme] ??= capture.tokens;
  }
  return output;
}

function buildComponentInventory(captures) {
  const inventory = {};

  for (const capture of captures) {
    for (const component of capture.components ?? []) {
      inventory[component.kind] ??= {};
      inventory[component.kind][capture.viewportName] ??= {};
      inventory[component.kind][capture.viewportName][capture.theme] = component.count;
    }
  }

  return inventory;
}

function buildVariantJson(input) {
  const slug = slugify(input.pageId);
  const desktopDay =
    input.captures.find((capture) => capture.viewportName === "desktop" && capture.theme === "day") ??
    input.captures[0];

  return {
    slug,
    sourceUrl: input.sourceUrl,
    themeSupport: input.themeSupport,
    primaryShell: desktopDay.shell,
    viewportShells: input.captures.map((capture) => ({
      viewportName: capture.viewportName,
      theme: capture.theme,
      shell: capture.shell,
    })),
    componentInventory: buildComponentInventory(input.captures),
  };
}

function buildMasterJson(input) {
  const viewportSet = uniqueStrings(input.captures.map((capture) => capture.viewportName));
  const variant = buildVariantJson(input);

  return {
    pageId: input.pageId,
    sourceUrl: input.sourceUrl,
    themeSupport: input.themeSupport,
    requiredThemes: buildThemeRequirements(input.captures, input.themeSupport),
    viewportSet,
    shellVariant: {
      slug: variant.slug,
      primaryShell: variant.primaryShell,
    },
    breakpointMatrix: buildBreakpointMatrix(input.captures),
    themeTokens: buildThemeTokens(input.captures),
    typographyScale: buildTypographyScale(input.captures),
    spacingScale: buildSpacingScale(input.captures),
    componentInventory: buildComponentInventory(input.captures),
  };
}

function renderThemeRule(themeSupport) {
  if (themeSupport === "dual") {
    return "- Day and night tokens are both required when the page supports both themes.";
  }

  return "- Only the available visible theme is required for this page package.";
}

function renderRequestedChanges(requestedChanges) {
  if (requestedChanges.length === 0) {
    return "- No explicit user-requested changes were supplied.";
  }

  return requestedChanges.map((item) => `- ${item}`).join("\n");
}

function renderComponentInventory(componentInventory) {
  return Object.entries(componentInventory)
    .map(([kind, viewports]) => {
      const parts = [];
      for (const [viewportName, themes] of Object.entries(viewports)) {
        for (const [theme, count] of Object.entries(themes)) {
          parts.push(`${viewportName}/${theme}: ${count}`);
        }
      }
      return `- \`${kind}\`: ${parts.join(", ")}`;
    })
    .join("\n");
}

function buildContractMarkdown({ master, variant, requestedChanges, masterJsonPath, variantJsonPath }) {
  const desktopShell =
    variant.viewportShells.find((entry) => entry.viewportName === "desktop" && entry.theme === "day")?.shell ??
    variant.primaryShell;

  return [
    "# Platform Page Design Contract",
    "",
    "## Scope",
    "",
    "- One page only.",
    `- Source URL: \`${master.sourceUrl}\``,
    `- Page ID: \`${master.pageId}\``,
    `- Master JSON: \`${masterJsonPath}\``,
    `- Variant JSON: \`${variantJsonPath}\``,
    "",
    "## Required Result",
    "",
    "- Produce a deterministic one-page platform design package.",
    renderThemeRule(master.themeSupport),
    "- Desktop, tablet, and mobile captures are all required baseline viewports.",
    "- Visible components and obvious openable page states belong in the package.",
    "",
    "## Allowed Differences",
    "",
    "- CI/BI swaps are allowed.",
    "- Explicit user-requested changes are allowed.",
    "- All other implementation details must remain identical to the reference page package.",
    "",
    "## Requested Changes",
    "",
    renderRequestedChanges(requestedChanges),
    "",
    "## Shell Contract",
    "",
    `- Desktop shell max width: \`${desktopShell.maxWidth}px\``,
    `- Desktop shell padding: \`${desktopShell.paddingLeft}px / ${desktopShell.paddingRight}px\``,
    `- Desktop header height: \`${desktopShell.headerHeight}px\``,
    `- Desktop rail width: \`${desktopShell.railWidth}px\``,
    "",
    "## Theme Tokens",
    "",
    `- Day background: \`${master.themeTokens.day?.background ?? "unknown"}\``,
    `- Day surface: \`${master.themeTokens.day?.surface ?? "unknown"}\``,
    `- Night background: \`${master.themeTokens.night?.background ?? "not captured"}\``,
    `- Night surface: \`${master.themeTokens.night?.surface ?? "not captured"}\``,
    "",
    "## Viewport Set",
    "",
    `- Required viewports: \`${master.viewportSet.join("`, `")}\``,
    "",
    "## Component Inventory",
    "",
    renderComponentInventory(master.componentInventory),
    "",
    "## Acceptance Rule",
    "",
    "- This contract remains scoped to a single page.",
    "- Do not turn this package into a crawl or a multi-route shell analysis.",
    "- If the page supports both themes, the package is incomplete until both are represented.",
    "",
  ].join("\n");
}

export async function buildPlatformPagePackage(options) {
  const inputPath = path.resolve(options.inputPath ?? options["input-path"] ?? "");
  if (!inputPath) {
    throw new Error("Missing required --input-path argument.");
  }

  const outputDir = path.resolve(
    options.outputDir ?? options["output-dir"] ?? path.join(path.dirname(inputPath), "platform-page-package")
  );
  ensureDir(outputDir);

  const requestedChanges = asList(options.requestedChanges ?? options["requested-changes"]);
  const input = readJson(inputPath);
  const master = buildMasterJson(input);
  const variant = buildVariantJson(input);

  const masterJsonPath = path.join(outputDir, "platform-design-system.json");
  const variantJsonPath = path.join(outputDir, `shell-variant-${variant.slug}.json`);
  const contractPath = path.join(outputDir, "platform-design-contract.md");

  fs.writeFileSync(masterJsonPath, `${JSON.stringify(master, null, 2)}\n`, "utf8");
  fs.writeFileSync(variantJsonPath, `${JSON.stringify(variant, null, 2)}\n`, "utf8");

  const contractMarkdown = buildContractMarkdown({
    master,
    variant,
    requestedChanges,
    masterJsonPath,
    variantJsonPath,
  });
  fs.writeFileSync(contractPath, `${contractMarkdown}\n`, "utf8");

  return {
    masterJsonPath,
    variantJsonPath,
    contractPath,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await buildPlatformPagePackage(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
