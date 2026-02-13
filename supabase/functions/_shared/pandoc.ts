type PandocNode = {
  t?: string;
  c?: unknown;
};

export type PandocBlockDraft = {
  block_type: string;
  block_content: string;
  path: string;
  parser_block_type: string;
};

export type PandocExtractResult = {
  blocks: PandocBlockDraft[];
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function scalarToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function collectStrings(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    const out: string[] = [];
    for (const item of value) out.push(...collectStrings(item));
    return out;
  }
  if (typeof value === "object") {
    const out: string[] = [];
    for (const item of Object.values(value as Record<string, unknown>)) {
      out.push(...collectStrings(item));
    }
    return out;
  }
  return [];
}

function inlineToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return normalizeWhitespace(value.map((v) => inlineToText(v)).join(" "));
  }
  if (typeof value !== "object") return scalarToText(value);

  const node = value as PandocNode;
  const t = node.t ?? "";
  const c = node.c;

  if (t === "Str") return scalarToText(c);
  if (t === "Space" || t === "SoftBreak" || t === "LineBreak") return " ";
  if (t === "Code" || t === "Math" || t === "RawInline") {
    if (Array.isArray(c) && c.length >= 2) return inlineToText(c[1]);
    return inlineToText(c);
  }
  if (t === "Link" || t === "Image") {
    if (Array.isArray(c) && c.length >= 2) return inlineToText(c[1]);
    return inlineToText(c);
  }
  if (
    t === "Emph" || t === "Strong" || t === "Underline" || t === "Strikeout" ||
    t === "SmallCaps" || t === "Superscript" || t === "Subscript" || t === "Span" ||
    t === "Quoted" || t === "Cite"
  ) {
    if (Array.isArray(c) && c.length >= 2 && (t === "Quoted" || t === "Cite")) {
      return inlineToText(c[1]);
    }
    return inlineToText(c);
  }
  if (t === "Note") {
    return blockListToText(c);
  }
  return normalizeWhitespace(collectStrings(c).join(" "));
}

function blockListToText(value: unknown): string {
  if (!Array.isArray(value)) return normalizeWhitespace(collectStrings(value).join(" "));
  const parts = value.map((node) => blockToText(node));
  return normalizeWhitespace(parts.join(" "));
}

function blockToText(block: unknown): string {
  if (!block || typeof block !== "object") return normalizeWhitespace(collectStrings(block).join(" "));
  const node = block as PandocNode;
  const t = node.t ?? "";
  const c = node.c;

  if (t === "Para" || t === "Plain") {
    return inlineToText(c);
  }
  if (t === "Header") {
    if (Array.isArray(c) && c.length >= 3) return inlineToText(c[2]);
    return inlineToText(c);
  }
  if (t === "CodeBlock") {
    if (Array.isArray(c) && c.length >= 2) return normalizeWhitespace(inlineToText(c[1]));
    return normalizeWhitespace(inlineToText(c));
  }
  if (t === "RawBlock") {
    if (Array.isArray(c) && c.length >= 2) return normalizeWhitespace(inlineToText(c[1]));
    return normalizeWhitespace(inlineToText(c));
  }
  if (t === "DefinitionList") {
    if (!Array.isArray(c)) return normalizeWhitespace(inlineToText(c));
    const entries = c.map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return normalizeWhitespace(inlineToText(entry));
      const term = inlineToText(entry[0]);
      const defs = Array.isArray(entry[1])
        ? entry[1].map((def) => blockListToText(def)).join(" ")
        : blockListToText(entry[1]);
      return normalizeWhitespace(`${term} ${defs}`);
    });
    return normalizeWhitespace(entries.join(" "));
  }
  if (t === "Table") {
    return normalizeWhitespace(collectStrings(c).join(" "));
  }
  if (t === "HorizontalRule") {
    return "";
  }
  if (t === "BulletList") {
    if (!Array.isArray(c)) return normalizeWhitespace(inlineToText(c));
    return normalizeWhitespace(c.map((item) => blockListToText(item)).join(" "));
  }
  if (t === "OrderedList") {
    if (!Array.isArray(c) || c.length < 2) return normalizeWhitespace(inlineToText(c));
    const listItems = Array.isArray(c[1]) ? c[1] : [];
    return normalizeWhitespace(listItems.map((item) => blockListToText(item)).join(" "));
  }
  return normalizeWhitespace(collectStrings(c).join(" "));
}

function mapBlockType(blockType: string, raw: unknown): string {
  if (blockType === "Header") return "heading";
  if (blockType === "Para" || blockType === "Plain") return "paragraph";
  if (blockType === "CodeBlock") return "code_block";
  if (blockType === "Table") return "table";
  if (blockType === "HorizontalRule") return "divider";
  if (blockType === "DefinitionList") return "definition";
  if (blockType === "RawBlock") {
    if (Array.isArray(raw) && raw.length >= 1) {
      const format = normalizeWhitespace(inlineToText(raw[0])).toLowerCase();
      if (format === "html") return "html_block";
    }
    return "other";
  }
  if (blockType === "BulletList" || blockType === "OrderedList") return "list_item";
  return "other";
}

function extractListItemBlocks(
  blockType: string,
  basePath: string,
  value: unknown,
): PandocBlockDraft[] {
  if (blockType === "BulletList") {
    if (!Array.isArray(value)) return [];
    return value.map((item, idx) => ({
      block_type: "list_item",
      block_content: blockListToText(item),
      path: `${basePath}.c[${idx}]`,
      parser_block_type: "BulletList",
    }));
  }
  if (blockType === "OrderedList") {
    if (!Array.isArray(value) || value.length < 2 || !Array.isArray(value[1])) return [];
    return value[1].map((item: unknown, idx: number) => ({
      block_type: "list_item",
      block_content: blockListToText(item),
      path: `${basePath}.c[1][${idx}]`,
      parser_block_type: "OrderedList",
    }));
  }
  return [];
}

export function extractPandocBlocks(pandocAstBytes: Uint8Array): PandocExtractResult {
  const text = new TextDecoder().decode(pandocAstBytes);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid Pandoc AST JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  const root = parsed as { blocks?: unknown };
  if (!Array.isArray(root.blocks)) {
    throw new Error("Invalid Pandoc AST: missing blocks array");
  }

  const blocks: PandocBlockDraft[] = [];
  for (let idx = 0; idx < root.blocks.length; idx++) {
    const block = root.blocks[idx] as PandocNode;
    const parserBlockType = typeof block?.t === "string" ? block.t : "Unknown";
    const path = `$.blocks[${idx}]`;

    if (parserBlockType === "BulletList" || parserBlockType === "OrderedList") {
      const listRows = extractListItemBlocks(parserBlockType, path, block.c);
      if (listRows.length > 0) {
        blocks.push(...listRows);
        continue;
      }
    }

    blocks.push({
      block_type: mapBlockType(parserBlockType, block.c),
      block_content: blockToText(block),
      path,
      parser_block_type: parserBlockType,
    });
  }

  return { blocks };
}
