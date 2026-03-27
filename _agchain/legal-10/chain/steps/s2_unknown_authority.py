"""S2: Unknown Authority.

Strict adherence to Article III:
- Implements resolve_prompt
- Returns (text, obj, meta)
"""

import json
from typing import Any

from chain.steps.base import Step
from core.ids.canonical import canonicalize_cite
from core.runtime.chain import ChainContext

S2_PROMPT_TEMPLATE = """You are a legal research assistant. Given the following Supreme Court case, list cases that cite this precedent.

CASE:
- Citation: {us_cite}
- Name: {case_name}
- Term: {term}
- Holding: {holding}

List up to 20 Supreme Court cases that cite this case, ranked by relevance/importance.
For each case, provide the U.S. Reports citation and case name.

Return a JSON object with:
- "citing_cases": An array of objects, each with "us_cite" and "case_name"

Return a single JSON object matching the schema exactly."""

class S2UnknownAuthority(Step):
    """S2: Unknown Authority - predict citing cases."""

    @property
    def step_id(self) -> str:
        return "s2"

    @property
    def step_name(self) -> str:
        return "s2"

    def requires(self) -> set[str]:
        return {"s1"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return ctx.instance.has_cited_text

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        cited = ctx.instance.cited_case
        s4_result = ctx.get("s4")
        holding = ""
        if s4_result and s4_result.parsed:
            holding = s4_result.parsed.get("holding_summary", "")

        variables = {
            "us_cite": cited.us_cite,
            "case_name": cited.case_name,
            "term": cited.term,
            "holding": holding or "(No holding summary available)",
        }

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables=variables,
            fallback=S2_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        try:
            match = json.loads(self._extract_json(raw_response))
            citing_cases = match.get("citing_cases", [])
            normalized = []
            for case in citing_cases:
                if isinstance(case, dict):
                    us_cite = case.get("us_cite", "")
                    case_name = case.get("case_name", "")
                    if us_cite:
                        normalized.append({
                            "us_cite": str(us_cite),
                            "case_name": str(case_name) if case_name else "",
                        })
            return {"citing_cases": normalized}
        except Exception as e:
            return {"errors": [f"Parse failed: {e}"]}

    def _extract_json(self, text: str) -> str:
        import re
        match = re.search(r"\{.*\}", text, re.DOTALL)
        return match.group(0) if match else text

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        edge = ctx.instance.edge
        return {
            "citing_case_us_cite": edge.citing_case_us_cite,
            "citing_case_name": edge.citing_case_name,
        }

    def score(self, parsed: dict[str, Any], ground_truth: dict[str, Any]) -> tuple[float, bool]:
        if "errors" in parsed:
            return (0.0, False)
        citing_cases = parsed.get("citing_cases", [])
        true_cite = ground_truth.get("citing_case_us_cite", "")
        if not true_cite:
            return (0.0, False)
        true_canonical = canonicalize_cite(true_cite)
        rank = None
        for i, case in enumerate(citing_cases):
            pred_cite = case.get("us_cite", "")
            if canonicalize_cite(pred_cite) == true_canonical:
                rank = i + 1
                break
        if rank is None:
            return (0.0, False)
        mrr = 1.0 / rank
        return (mrr, rank <= 10)
