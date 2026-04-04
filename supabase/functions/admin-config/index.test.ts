import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapAdminConfigErrorToResponse } from "./index.ts";

Deno.test("mapAdminConfigErrorToResponse maps Blockdata Admin forbidden errors to 403", async () => {
  const response = mapAdminConfigErrorToResponse(
    new Error("Forbidden: blockdata admin access required"),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "Forbidden: blockdata admin access required",
  });
});

Deno.test("mapAdminConfigErrorToResponse maps Blockdata Admin configuration errors to 503", async () => {
  const response = mapAdminConfigErrorToResponse(
    new Error("Blockdata Admin access is not configured"),
  );

  assertEquals(response.status, 503);
  assertEquals(await response.json(), {
    error: "Blockdata Admin access is not configured",
  });
});
