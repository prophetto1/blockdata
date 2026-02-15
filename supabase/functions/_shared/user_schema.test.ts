import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateFlatUserSchema } from "./user_schema.ts";

Deno.test("validateFlatUserSchema accepts flat scalar properties", () => {
  const issues = validateFlatUserSchema({
    type: "object",
    properties: {
      title: { type: "string" },
      confidence: { type: "number" },
      approved: { type: "boolean" },
    },
  });
  assertEquals(issues, []);
});

Deno.test("validateFlatUserSchema rejects nested object fields", () => {
  const issues = validateFlatUserSchema({
    type: "object",
    properties: {
      nested: {
        type: "object",
        properties: {
          inner: { type: "string" },
        },
      },
    },
  });
  assertEquals(issues.length > 0, true);
});

Deno.test("validateFlatUserSchema rejects array of objects", () => {
  const issues = validateFlatUserSchema({
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        },
      },
    },
  });
  assertEquals(issues.length > 0, true);
});
