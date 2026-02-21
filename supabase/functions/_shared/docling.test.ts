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

Deno.test("extractDoclingBlocks emits ordered unique page_nos and first page_no", () => {
  const doc = {
    furniture: { self_ref: "#/furniture", children: [] },
    body: { self_ref: "#/body", children: [{ $ref: "#/texts/0" }] },
    texts: [
      {
        self_ref: "#/texts/0",
        label: "paragraph",
        text: "Across multiple pages",
        prov: [
          { page_no: 2 },
          { page_no: 1 },
          { page_no: 2 },
          { page_no: 3 },
        ],
      },
    ],
    tables: [],
    pictures: [],
  };

  const result = extractDoclingBlocks(encoder.encode(JSON.stringify(doc)));
  assertEquals(result.blocks.length, 1);
  assertEquals(result.blocks[0].page_nos, [1, 2, 3]);
  assertEquals(result.blocks[0].page_no, 1);
});
