import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractDoclingBlocks } from "./docling.ts";

const encoder = new TextEncoder();

Deno.test("extractDoclingBlocks includes parser-native metadata", () => {
  const doc = {
    furniture: { self_ref: "#/furniture", children: [] },
    body: { self_ref: "#/body", children: [{ $ref: "#/texts/0" }] },
    texts: [
      {
        self_ref: "#/texts/0",
        label: "paragraph",
        text: "Hello from docling",
      },
    ],
    tables: [],
    pictures: [],
  };

  const result = extractDoclingBlocks(encoder.encode(JSON.stringify(doc)));
  assertEquals(result.blocks.length, 1);
  assertEquals(result.blocks[0].block_type, "paragraph");
  assertEquals(result.blocks[0].parser_block_type, "paragraph");
  assertEquals(result.blocks[0].parser_path, "#/texts/0");
});
