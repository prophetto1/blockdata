import { assertEquals } from "jsr:@std/assert";
import {
  assemblePageText,
  getPageCount,
  buildExtractionItems,
} from "./docling_page_text.ts";

const fixture = {
  texts: [
    { self_ref: "#/texts/0", label: "title", text: "Introduction", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/1", label: "paragraph", text: "Page one content.", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/2", label: "paragraph", text: "Page two content.", prov: [{ page_no: 2 }] },
    { self_ref: "#/texts/3", label: "header", text: "Header text", prov: [{ page_no: 1 }] },
    { self_ref: "#/texts/4", label: "caption", text: "Figure 1: Chart caption", prov: [{ page_no: 2 }] },
  ],
  tables: [
    {
      self_ref: "#/tables/0",
      label: "table",
      prov: [{ page_no: 2 }],
      data: {
        table_cells: [
          { text: "Name", start_row_offset_idx: 0, start_col_offset_idx: 0 },
          { text: "Age", start_row_offset_idx: 0, start_col_offset_idx: 1 },
          { text: "Alice", start_row_offset_idx: 1, start_col_offset_idx: 0 },
          { text: "30", start_row_offset_idx: 1, start_col_offset_idx: 1 },
        ],
        num_rows: 2,
        num_cols: 2,
      },
    },
  ],
  pictures: [
    {
      self_ref: "#/pictures/0",
      label: "picture",
      prov: [{ page_no: 2 }],
      children: [{ $ref: "#/texts/4" }],
    },
  ],
  key_value_items: [
    { self_ref: "#/key_value_items/0", label: "kv", text: "Invoice: 12345", prov: [{ page_no: 1 }] },
  ],
  form_items: [
    { self_ref: "#/form_items/0", label: "form", text: "Field: Value", prov: [{ page_no: 2 }] },
  ],
  groups: [
    { self_ref: "#/groups/0", children: [{ $ref: "#/texts/0" }, { $ref: "#/texts/1" }] },
  ],
  body: {
    children: [
      { $ref: "#/groups/0" },
      { $ref: "#/texts/2" },
      { $ref: "#/tables/0" },
      { $ref: "#/pictures/0" },
      { $ref: "#/key_value_items/0" },
      { $ref: "#/form_items/0" },
    ],
  },
  furniture: {
    children: [{ $ref: "#/texts/3" }],
  },
};

Deno.test("assemblePageText groups text by page in reading order", () => {
  const result = assemblePageText(fixture);
  assertEquals(result.size, 2);

  const page1 = result.get(1)!;
  assertEquals(page1.includes("Introduction"), true);
  assertEquals(page1.includes("Page one content"), true);
  assertEquals(page1.includes("Invoice: 12345"), true);
  assertEquals(page1.includes("Header text"), true);

  const page2 = result.get(2)!;
  assertEquals(page2.includes("Page two content"), true);
  assertEquals(page2.includes("Name | Age"), true);
  assertEquals(page2.includes("Alice | 30"), true);
  assertEquals(page2.includes("Field: Value"), true);
});

Deno.test("assemblePageText reconstructs tables from table_cells as grid", () => {
  const result = assemblePageText(fixture);
  const page2 = result.get(2)!;
  assertEquals(page2.includes("Name | Age\nAlice | 30"), true);
});

Deno.test("assemblePageText traverses furniture", () => {
  const result = assemblePageText(fixture);
  const page1 = result.get(1)!;
  assertEquals(page1.includes("Header text"), true);
});

Deno.test("assemblePageText walks picture children (captions)", () => {
  const result = assemblePageText(fixture);
  const page2 = result.get(2)!;
  assertEquals(page2.includes("Figure 1: Chart caption"), true);
});

Deno.test("getPageCount returns max page number from provenance", () => {
  assertEquals(getPageCount(fixture), 2);
});

Deno.test("getPageCount returns 0 for empty document", () => {
  assertEquals(getPageCount({}), 0);
});

Deno.test("getPageCount includes picture provenance", () => {
  const doc = {
    pictures: [{ self_ref: "#/pictures/0", prov: [{ page_no: 5 }] }],
  };
  assertEquals(getPageCount(doc), 5);
});

Deno.test("buildExtractionItems: document mode creates one item", () => {
  const items = buildExtractionItems({ totalPages: 4, extractionTarget: "document" });
  assertEquals(items, [{ target_kind: "document", page_number: null }]);
});

Deno.test("buildExtractionItems: page mode creates one item per page in range", () => {
  const items = buildExtractionItems({
    totalPages: 4,
    extractionTarget: "page",
    pageRange: { start: 2, end: 3 },
  });
  assertEquals(items, [
    { target_kind: "page", page_number: 2 },
    { target_kind: "page", page_number: 3 },
  ]);
});

Deno.test("buildExtractionItems: page mode defaults to full document range", () => {
  const items = buildExtractionItems({ totalPages: 3, extractionTarget: "page" });
  assertEquals(items.length, 3);
  assertEquals(items[0], { target_kind: "page", page_number: 1 });
  assertEquals(items[2], { target_kind: "page", page_number: 3 });
});
