"""S6: IRAC Synthesis (legacy step ID).

Canonical naming (spec): this corresponds to **j6 (closed-book IRAC)**.

Important: in the updated step specs, IRAC quality is **judge-scored** (MEE-style)
and the judge is **required**. Any scoring done inside this module should be
treated as *structural/schema compliance only*, not the final IRAC quality score.

See: `internal/specs/steps/irac_synthesis.md`.
"""

import json
from typing import Any

from chain.steps.base import Step
from core.runtime.chain import ChainContext

# Prompt template for S6
S6_PROMPT_TEMPLATE = """You are a legal research assistant. Synthesize the following information into a complete IRAC legal analysis.

CASE INFORMATION:
- Citation: {us_cite}
- Name: {case_name}
- Term: {term}

EXTRACTED FACTS (from S4):
- Disposition: {disposition}
- Party Winning: {party_winning}
- Holding: {holding}

AUTHORITY STATUS (from S3):
{authority_status}

RELATIONSHIP ANALYSIS (from S5):
{relationship_analysis}

CITING CASES (from S2):
{citing_cases}

Write a complete IRAC analysis of this case:

1. ISSUE: State the central legal question the Court addressed.

2. RULE: Identify the legal rule or principle the Court applied.

3. APPLICATION: Explain how the Court applied the rule to the facts.

4. CONCLUSION: State the Court's holding and its significance.

Return a JSON object with these fields:
- "issue": The legal issue (1-2 sentences)
- "rule": The applicable rule (1-2 sentences)
- "application": How the rule was applied (2-3 sentences)
- "conclusion": The holding and significance (1-2 sentences)

Return a single JSON object matching the schema exactly.
No extra keys. No surrounding text. No markdown code fences."""


class S6IRACSynthesis(Step):
    """S6: IRAC Synthesis - combine prior step outputs.

    Notes:
    - Legacy chain ID: `s6`
    - Canonical spec concept: `j6` (closed-book IRAC)
    """

    @property
    def step_id(self) -> str:
        return "s6"

    @property
    def step_name(self) -> str:
        return "s6"

    def requires(self) -> set[str]:
        return {"s1", "s2", "s3", "s4", "s5:cb"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return ctx.instance.has_cited_text

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        """Build S6 prompt."""
        cited = ctx.instance.cited_case

        # Get S4 results
        s4_result = ctx.get("s4")
        if s4_result and s4_result.parsed:
            disposition = s4_result.parsed.get("disposition", "unknown")
            party_winning = s4_result.parsed.get("party_winning", "unknown")
            holding = s4_result.parsed.get("holding_summary", "")
        else:
            disposition = "unknown"
            party_winning = "unknown"
            holding = ""

        # Get S3 results (dual-channel authority status reporting)
        s3_result = ctx.get("s3")
        if s3_result and isinstance(s3_result.parsed, dict) and s3_result.parsed:
            curated = s3_result.parsed.get("curated_annotation", {}) or {}
            citator = s3_result.parsed.get("citator_treatment", {}) or {}
            consistency = s3_result.parsed.get("consistency_flag", "UNKNOWN")
            caveat = s3_result.parsed.get("caveat", "")

            curated_present = curated.get("present", False)
            curated_overruling = curated.get("overruling_case", None)
            curated_year = curated.get("year_overruled", None)
            curated_full = curated.get("overruled_in_full", None)

            edge_label = citator.get("edge_label", None)
            agree = citator.get("agree", None)

            authority_status = (
                "CURATED ANNOTATION (Dahl):\n"
                f"- present: {bool(curated_present)}\n"
                f"- overruling_case: {curated_overruling}\n"
                f"- year_overruled: {curated_year}\n"
                f"- overruled_in_full: {curated_full}\n\n"
                "CITATOR TREATMENT (Shepard's for this pair):\n"
                f"- edge_label: {edge_label}\n"
                f"- agree: {agree}\n\n"
                f"consistency_flag: {consistency}\n"
                f"caveat: {caveat}".strip()
            )
        else:
            authority_status = "Authority status unknown."

        # Get S5:cb results
        s5_result = ctx.get("s5:cb")
        if s5_result and s5_result.parsed:
            agrees = s5_result.parsed.get("agrees", None)
            reasoning = s5_result.parsed.get("reasoning", "")
            if agrees is True:
                relationship_analysis = f"The citing case AGREES with this precedent. {reasoning}"
            elif agrees is False:
                relationship_analysis = f"The citing case DISTINGUISHES this precedent. {reasoning}"
            else:
                relationship_analysis = "Relationship unclear."
        else:
            relationship_analysis = "No relationship analysis available."

        # Get S2 results
        s2_result = ctx.get("s2")
        if s2_result and s2_result.parsed:
            citing_cases_list = s2_result.parsed.get("citing_cases", [])
            if citing_cases_list:
                cases_str = "\n".join(
                    f"  - {c.get('case_name', 'Unknown')} ({c.get('us_cite', '')})"
                    for c in citing_cases_list[:5]
                )
                citing_cases = f"Cases that cite this precedent:\n{cases_str}"
            else:
                citing_cases = "No citing cases identified."
        else:
            citing_cases = "No citing cases available."

        variables = {
            "us_cite": cited.us_cite,
            "case_name": cited.case_name,
            "term": cited.term,
            "disposition": disposition,
            "party_winning": party_winning,
            "holding": holding or "(No holding summary available)",
            "authority_status": authority_status,
            "relationship_analysis": relationship_analysis,
            "citing_cases": citing_cases,
        }

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables=variables,
            fallback=S6_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        """Parse S6 response."""
        try:
            response = raw_response.strip()

            if response.startswith("```"):
                lines = response.split("\n")
                json_lines = []
                in_block = False
                for line in lines:
                    if line.startswith("```") and not in_block:
                        in_block = True
                        continue
                    elif line.startswith("```") and in_block:
                        break
                    elif in_block:
                        json_lines.append(line)
                response = "\n".join(json_lines)

            data = json.loads(response)

            if not isinstance(data, dict):
                return {"errors": ["Response is not a JSON object"]}

            issue = data.get("issue", "")
            rule = data.get("rule", "")
            application = data.get("application", "")
            conclusion = data.get("conclusion", "")

            return {
                "issue": str(issue) if issue else "",
                "rule": str(rule) if rule else "",
                "application": str(application) if application else "",
                "conclusion": str(conclusion) if conclusion else "",
            }

        except json.JSONDecodeError as e:
            return {"errors": [f"JSON parse error: {e}"]}

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        # Canonical spec: both j6 and j7 are judge-scored.
        # This ground_truth exists mainly to make the "judge required" intent explicit.
        return {
            "canonical_step": "j6",
            "judge_required": True,
            "rubric": "mee_judge_required",
            "structural_components": ["issue", "rule", "application", "conclusion"],
        }

    def score(
        self, parsed: dict[str, Any], ground_truth: dict[str, Any]
    ) -> tuple[float, bool]:
        # Structural/schema compliance only (NOT MEE judge quality).
        if "errors" in parsed:
            return (0.0, False)

        components = ["issue", "rule", "application", "conclusion"]
        component_score = 0.0

        for component in components:
            value = parsed.get(component, "")
            if isinstance(value, str) and len(value.strip()) > 10:
                component_score += 0.25

        correct = component_score >= 0.75
        return (component_score, correct)
