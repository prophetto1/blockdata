import { unified } from "npm:unified@11";
import remarkParse from "npm:remark-parse@11";
import remarkGfm from "npm:remark-gfm@4";
import { toString } from "npm:mdast-util-to-string@4";
import type {
  Content,
  Heading,
  List,
  ListItem,
  Root,
} from "npm:@types/mdast@4";

export type BlockDraft = {
  block_type: string;
  section_path: string[];
  char_span: [number, number];
  content_original: string;
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
  const headingStack: string[] = [];

  // Note: remark-gfm can introduce mdast node types that aren't in the narrow
  // `Content` union from @types/mdast. We intentionally treat nodes as `any`
  // while preserving strong typing for our extracted BlockDraft.
  const emit = (node: any, blockType: string) => {
    const span = getSpan(node);
    const contentSlice = markdown.slice(span[0], span[1]);
    blocks.push({
      block_type: blockType,
      section_path: [...headingStack],
      char_span: span,
      content_original: contentSlice,
    });
  };

  const visit = (node: any) => {
    switch (node.type) {
      case "heading": {
        const heading = node as Heading;
        const text = toString(heading).trim();
        if (heading.depth === 1 && !docTitle && text) docTitle = text;
        const depth = heading.depth ?? 1;
        headingStack.length = Math.max(0, depth - 1);
        headingStack.push(text || "(untitled)");
        emit(node, "heading");
        return;
      }
      case "list": {
        const list = node as List;
        for (const child of list.children ?? []) visit(child as Content);
        return;
      }
      case "listItem": {
        const item = node as ListItem;
        emit(node, "list_item");
        for (const child of item.children ?? []) {
          // For Phase 1 we keep list nesting implied by order; do not emit extra nested blocks.
          // The list item itself is the block.
          void child;
        }
        return;
      }
      case "paragraph":
        emit(node, "paragraph");
        return;
      case "blockquote":
        emit(node, "blockquote");
        return;
      case "code":
        emit(node, "code");
        return;
      case "table":
        emit(node, "table");
        return;
      case "footnoteDefinition":
        emit(node, "footnote_definition");
        return;
      case "thematicBreak":
        emit(node, "thematic_break");
        return;
      default: {
        // Fallback: treat unknown block-level nodes as their mdast type.
        emit(node, node.type);
      }
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
