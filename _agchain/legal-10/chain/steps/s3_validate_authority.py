"""S3: Authority Status.

Strict adherence to Article III:
- Implements resolve_prompt
- Returns (text, obj, meta)
"""

import json
from typing import Any

from chain.steps.base import Step
from core.runtime.chain import ChainContext
from core.runtime.ground_truth import SHEPARDS_TO_V2_TREATMENT

MANDATORY_CAVEAT = "Dataset annotation; not a good-law determination."

OVERRULE_SIGNALS = frozenset(
    signal for signal, label in SHEPARDS_TO_V2_TREATMENT.items() if label == "overrules"
)

def _compute_consistency_flag(*, curated_present: bool, edge_label: str | None) -> str:
    citator_present = edge_label is not None
    normalized_edge = edge_label.lower() if isinstance(edge_label, str) else None
    citator_has_overrule = (
        normalized_edge in OVERRULE_SIGNALS if normalized_edge is not None else False
    )
    if curated_present and citator_present:
        return "CONSISTENT" if (curated_present == citator_has_overrule) else "INCONSISTENT"
    if curated_present:
        return "CURATED_ONLY"
    return "CITATOR_ONLY"

S3_PROMPT_TEMPLATE = """You are a legal research assistant. You must report dataset annotations about authority status.

This is NOT a doctrinal good-law determination. You are only reporting what two data sources say.

CASE:
- Citation: {us_cite}
- Name: {case_name}
- Term: {term}

CURATED ANNOTATION (Dahl):
{curated_block}

CITATOR TREATMENT (Shepard's for this pair):
- edge_label: {edge_label}
- agree: {agree}

Return a JSON object with:
- "curated_annotation": {{
    "present": boolean,
    "overruling_case": string|null,
    "year_overruled": integer|null,
    "overruled_in_full": boolean|null
  }}
- "citator_treatment": {{
    "edge_label": string|null,
    "agree": boolean|null
  }}
- "consistency_flag": one of ["CONSISTENT","INCONSISTENT","CURATED_ONLY","CITATOR_ONLY"]
- "caveat": "{mandatory_caveat}"

Return a single JSON object matching the schema exactly."""

class S3ValidateAuthority(Step):
    """S3: Authority Status - dual-channel reporting."""

    @property
    def step_id(self) -> str:
        return "s3"

    @property
    def step_name(self) -> str:
        return "s3"

    def requires(self) -> set[str]:
        return {"s1"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return True

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        cited = ctx.instance.cited_case
        overrule = ctx.instance.overrule
        edge = ctx.instance.edge

        if overrule is None:
            curated_block = "- present: false"
        else:
            curated_block = (
                "- present: true\n"
                f"- overruling_case: {overrule.overruling_case_name}\n"
                f"- year_overruled: {overrule.year_overruled}\n"
                f"- overruled_in_full: {overrule.overruled_in_full}"
            )

        edge_label = edge.shepards if edge.shepards else None
        agree = edge.agree if edge_label is not None else None

        variables = {
            "us_cite": cited.us_cite,
            "case_name": cited.case_name,
            "term": cited.term,
            "curated_block": curated_block,
            "edge_label": edge_label,
            "agree": agree,
            "mandatory_caveat": MANDATORY_CAVEAT,
        }

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables=variables,
            fallback=S3_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        try:
            import re
            match = re.search(r"\{.*\}", raw_response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            pass
        return {"errors": ["Parse failed"], "raw": raw_response}

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        overrule = ctx.instance.overrule
        edge = ctx.instance.edge
        curated_present = overrule is not None
        edge_label = edge.shepards if edge.shepards else None
        return {
            "curated_annotation": {
                "present": curated_present,
                "overruling_case": overrule.overruling_case_name if curated_present else None,
                "year_overruled": overrule.year_overruled if curated_present else None,
                "overruled_in_full": overrule.overruled_in_full if curated_present else None,
            },
            "citator_treatment": {
                "edge_label": edge_label,
                "agree": edge.agree if edge_label is not None else None,
            },
            "consistency_flag": _compute_consistency_flag(curated_present=curated_present, edge_label=edge_label),
            "caveat": MANDATORY_CAVEAT,
        }

    def score(self, parsed: dict[str, Any], ground_truth: dict[str, Any]) -> tuple[float, bool]:
        if "errors" in parsed:
            return (0.0, False)
        
        # Simple match for consistency
        score = 1.0 if parsed.get("consistency_flag") == ground_truth.get("consistency_flag") else 0.0
        return (score, score == 1.0)
