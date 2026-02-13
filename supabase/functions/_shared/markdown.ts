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
  parser_block_type: string;
  parser_path: string;
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
  const emit = (node: any, blockType: string, path: string) => {
    const span = getSpan(node);
    const contentSlice = markdown.slice(span[0], span[1]);
    blocks.push({
      block_type: blockType,
      start_offset: span[0],
      end_offset: span[1],
      block_content: contentSlice,
      parser_block_type: typeof node.type === "string" ? node.type : "unknown",
      parser_path: path,
    });
  };

  // Block type mapping: mdast node types → v2 platform_block_type enum.
  // See docs/product-defining-v2.0/0207-blocks.md for the canonical enum.
  const visit = (node: any, path: string) => {
    switch (node.type) {
      case "heading": {
        const heading = node as Heading;
        const text = toString(heading).trim();
        if (heading.depth === 1 && !docTitle && text) docTitle = text;
        emit(node, "heading", path);
        return;
      }
      case "list": {
        const list = node as List;
        for (let i = 0; i < (list.children ?? []).length; i++) {
          visit(list.children[i] as Content, `${path}.children[${i}]`);
        }
        return;
      }
      case "listItem":
        emit(node, "list_item", path);
        return;
      case "paragraph":
        emit(node, "paragraph", path);
        return;
      case "code":
        emit(node, "code_block", path);
        return;
      case "table":
        emit(node, "table", path);
        return;
      case "html":
        emit(node, "html_block", path);
        return;
      case "definition":
        emit(node, "definition", path);
        return;
      case "footnoteDefinition":
        emit(node, "footnote", path);
        return;
      case "thematicBreak":
        emit(node, "divider", path);
        return;
      default:
        emit(node, "other", path);
        return;
    }
  };

  for (let i = 0; i < (tree.children ?? []).length; i++) {
    visit(tree.children[i] as Content, `$.children[${i}]`);
  }

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
