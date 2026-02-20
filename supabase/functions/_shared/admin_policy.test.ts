import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyPolicyValue, runtimePolicyDefaults } from "./admin_policy.ts";

Deno.test("applyPolicyValue accepts platform LLM transport and LiteLLM base URL", () => {
  const policy = runtimePolicyDefaults();
  const okTransport = applyPolicyValue(
    policy,
    "models.platform_llm_transport",
    "litellm_openai",
  );
  const okBaseUrl = applyPolicyValue(
    policy,
    "models.platform_litellm_base_url",
    "https://litellm.example.com/v1",
  );

  assertEquals(okTransport, true);
  assertEquals(okBaseUrl, true);
  assertEquals(policy.models.platform_llm_transport, "litellm_openai");
  assertEquals(policy.models.platform_litellm_base_url, "https://litellm.example.com/v1");
});
