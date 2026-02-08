import { unified } from "npm:unified@11";
import remarkParse from "npm:remark-parse@11";
import remarkGfm from "npm:remark-gfm@4";
import { toString } from "npm:mdast-util-to-string@4";
import type {
  Content,
  Heading,
  List,
  Root,
} from "npm:@types/mdast@4";

export type BlockDraft = {
  block_type: string;
  start_offset: number;
  end_offset: number;
  block_content: string;
};

export type ExtractBlocksResult = {
  docTitle: string | null;
  blocks: BlockDraft[];
};

export function extractBlocks(markdown: string): ExtractBlocksResult {
  // remark-parse provides the base mdast; remark-gfm extends parsing for
  // tables, strikethrough, task lists, and footnotes (GitHub-flavored Markdown).
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;

  let docTitle: string | null = null;
  const blocks: BlockDraft[] = [];

  // Note: remark-gfm can introduce mdast node types that aren't in the narrow
  // `Content` union from @types/mdast. We intentionally treat nodes as `any`
  // while preserving strong typing for our extracted BlockDraft.
  const emit = (node: any, blockType: string) => {
    const span = getSpan(node);
    const contentSlice = markdown.slice(span[0], span[1]);
    blocks.push({
      block_type: blockType,
      start_offset: span[0],
      end_offset: span[1],
      block_content: contentSlice,
    });
  };

  // Block type mapping: mdast node types → v2 platform_block_type enum.
  // See docs/product-defining-v2.0/0207-blocks.md for the canonical enum.
  const visit = (node: any) => {
    switch (node.type) {
      case "heading": {
        const heading = node as Heading;
        const text = toString(heading).trim();
        if (heading.depth === 1 && !docTitle && text) docTitle = text;
        emit(node, "heading");
        return;
      }
      case "list": {
        const list = node as List;
        for (const child of list.children ?? []) visit(child as Content);
        return;
      }
      case "listItem":
        emit(node, "list_item");
        return;
      case "paragraph":
        emit(node, "paragraph");
        return;
      case "code":
        emit(node, "code_block");
        return;
      case "table":
        emit(node, "table");
        return;
      case "html":
        emit(node, "html_block");
        return;
      case "definition":
        emit(node, "definition");
        return;
      case "footnoteDefinition":
        emit(node, "footnote");
        return;
      case "thematicBreak":
        emit(node, "divider");
        return;
      default:
        emit(node, "other");
        return;
    }
  };

  for (const child of tree.children ?? []) visit(child as Content);

  return { docTitle, blocks };
}

function getSpan(node: { position?: any }): [number, number] {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== "number" || typeof end !== "number") {
    throw new Error(`Missing mdast offsets for node`);
  }
  if (start < 0 || end < 0 || start > end) {
    throw new Error(`Invalid mdast offsets: ${start}..${end}`);
  }
  return [start, end];
}
