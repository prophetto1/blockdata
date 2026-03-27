"""S7: Open-Book IRAC Synthesis (legacy step ID).

Canonical naming (spec): this corresponds to **j7 (open-book IRAC)** after the
authority evidence is admitted.

Important: in the updated step specs, IRAC quality is **judge-scored** (MEE-style)
and the judge is **required**. Any scoring done inside this module should be
treated as *structural/schema compliance only*, not the final IRAC quality score.

See: `internal/specs/steps/irac_synthesis.md`.
"""

import json
from typing import Any

from chain.steps.base import Step
from core.runtime.chain import ChainContext
from core.runtime.research_pack import ResearchPack

# Prompt template for S7
S7_PROMPT_TEMPLATE = """You are a legal research assistant writing a memo from a provided research packet.

{research_packet_text}

REFERENCE MATERIAL (PRIOR DRAFT):
Below is a preliminary draft from a closed-book analysis. Use it for context, but prioritize the primary documents in the Research Packet.

{s6_draft}

TASK:
Write a complete IRAC legal analysis of the case based on the Research Packet.

RULES:
1. Every material claim must cite the specific document ID from the packet (e.g., [DOC1], [DOC2], [DOC3]).
2. Any case authority you rely on must include a literal U.S. Reports citation (e.g., "Strickland v. Washington, 466 U.S. 668"). `[DOC#]` references alone are not sufficient.
3. If the documents (DOC1/DOC2) conflict with the status report (DOC3), you MUST surface and reason about this conflict.
4. No unqualified doctrinal status claims unless the Research Packet clearly warrants them.

Return a JSON object with these fields:
- "issue": The legal issue with citation (1-2 sentences)
- "rule": The applicable rule with citations (1-2 sentences)
- "application": Facts-to-rule application with deep citations (2-3 sentences)
- "conclusion": Final determination with citations (1-2 sentences)

Return a single JSON object matching the schema exactly."""


class S7OpenBookSynthesis(Step):
    """S7: Open-Book IRAC - Synthesize from ResearchPack.

    Notes:
    - Legacy chain ID: `s7`
    - Canonical spec concept: `j7` (open-book IRAC)
    """

    @property
    def step_id(self) -> str:
        return "s7"

    @property
    def step_name(self) -> str:
        return "s7"

    def requires(self) -> set[str]:
        return {"s6"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return "research_pack" in ctx.data and ctx.data["research_pack"] is not None

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        """Build S7 prompt."""
        pack: ResearchPack = ctx.data.get("research_pack")
        s6_result = ctx.get("s6")

        # Get S6 draft text
        if s6_result and isinstance(s6_result.parsed, dict) and s6_result.parsed:
            p = s6_result.parsed
            s6_draft = (
                f"ISSUE: {p.get('issue')}\n"
                f"RULE: {p.get('rule')}\n"
                f"APP: {p.get('application')}\n"
                f"CONC: {p.get('conclusion')}"
            )
        else:
            s6_draft = "No prior draft available."

        variables = {
            "research_packet_text": pack.render_prompt_text() if pack else "",
            "s6_draft": s6_draft
        }

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables=variables,
            fallback=S7_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        """Parse S7 JSON response."""
        try:
            cleaned = raw_response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                cleaned = "\n".join([l for l in lines if not l.startswith("```")])

            data = json.loads(cleaned)
            return {
                "issue": str(data.get("issue", "")),
                "rule": str(data.get("rule", "")),
                "application": str(data.get("application", "")),
                "conclusion": str(data.get("conclusion", "")),
            }
        except Exception as e:
            return {"errors": [f"Parse failed: {e}"]}

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        pack = ctx.data.get("research_pack")
        return {
            "canonical_step": "j7",
            "judge_required": True,
            "pack_id": pack.pack_id if pack else "UNKNOWN",
            "anchors": ctx.data.get("anchors", {})
        }

    def score(
        self, parsed: dict[str, Any], ground_truth: dict[str, Any]
    ) -> tuple[float, bool]:
        # Structural/schema compliance only (NOT MEE judge quality).
        if "errors" in parsed:
            return (0.0, False)

        # Basic presence count
        count = sum(1 for v in parsed.values() if len(str(v)) > 10)
        score = count / 4.0
        return (score, score >= 0.75)
