"""S5: Distinguish (Proposed).

Strict adherence to Article III:
- Implements resolve_prompt
- Returns (text, obj, meta)
- Isolated from stable code
"""

import json
from typing import Any

from chain.steps.base import Step
from core.runtime.chain import ChainContext
from core.runtime.ground_truth import V2_TREATMENT_ENUM, normalize_shepards_to_treatment

# Prompt template for S5:cb
S5_CB_PROMPT_TEMPLATE = """You are a legal research assistant analyzing the relationship between two Supreme Court cases.

CITED CASE (the precedent):
- Citation: {cited_cite}
- Name: {cited_name}
- Term: {cited_term}
- Disposition: {cited_disposition}
- Party Winning: {cited_party_winning}
- Holding: {cited_holding}

CITING CASE (the later case):
- Citation: {citing_cite}
- Name: {citing_name}

Based on the Shepard's signal "{shepards}", determine whether the citing case AGREES with or DISTINGUISHES the cited case.

A case AGREES if it follows, applies, or extends the precedent.
A case DISTINGUISHES if it criticizes, limits, questions, or overrules the precedent.

Return a JSON object with:
- "predicted_treatment": one of {treatment_enum}
- "predicted_agree": true if the citing case agrees with the precedent, false otherwise
- "reasoning": A brief explanation of your determination
- "evidence_quotes": []  (empty array; no opinion text is provided in this mode)

Return a single JSON object matching the schema exactly.
No extra keys. No surrounding text. No markdown code fences."""

# Prompt template for S5:rag
S5_RAG_PROMPT_TEMPLATE = """You are a legal research assistant analyzing the relationship between two Supreme Court cases.

CITED CASE (the precedent):
- Citation: {cited_cite}
- Name: {cited_name}
- Term: {cited_term}
- Disposition: {cited_disposition}
- Party Winning: {cited_party_winning}
- Holding: {cited_holding}

CITING CASE (the later case):
- Citation: {citing_cite}
- Name: {citing_name}

CITING CASE OPINION (excerpt):
{citing_opinion}

Based on the citing case's treatment of the precedent, determine whether it AGREES with or DISTINGUISHES the cited case.

A case AGREES if it follows, applies, or extends the precedent.
A case DISTINGUISHES if it criticizes, limits, questions, or overrules the precedent.

Return a JSON object with:
- "predicted_treatment": one of {treatment_enum}
- "predicted_agree": true if the citing case agrees with the precedent, false otherwise
- "reasoning": A brief explanation based on the opinion text
- "evidence_quotes": An array of short supporting quotes from the citing opinion

Return a single JSON object matching the schema exactly.
No extra keys. No surrounding text. No markdown code fences."""


class S5DistinguishCB(Step):
    """S5:cb - Distinguish using backbone."""

    @property
    def step_id(self) -> str:
        return "s5:cb"

    @property
    def step_name(self) -> str:
        return "s5"

    def requires(self) -> set[str]:
        return {"s1", "s4"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return ctx.instance.has_cited_text

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        """Build S5:cb prompt."""
        cited = ctx.instance.cited_case
        edge = ctx.instance.edge

        s4_result = ctx.get("s4")
        if s4_result and s4_result.parsed:
            disposition = s4_result.parsed.get("disposition", "unknown")
            party_winning = s4_result.parsed.get("party_winning", "unknown")
            holding = s4_result.parsed.get("holding_summary", "")
        else:
            disposition = "unknown"
            party_winning = "unknown"
            holding = ""

        variables = {
            "cited_cite": cited.us_cite,
            "cited_name": cited.case_name,
            "cited_term": cited.term,
            "cited_disposition": disposition,
            "cited_party_winning": party_winning,
            "cited_holding": holding,
            "citing_cite": edge.citing_case_us_cite,
            "citing_name": edge.citing_case_name or "Unknown",
            "shepards": edge.shepards or "cited",
            "treatment_enum": sorted(V2_TREATMENT_ENUM),
        }

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables=variables,
            fallback=S5_CB_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        return _parse_s5_response(raw_response)

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        edge = ctx.instance.edge
        return {
            "agree": edge.agree,
            "agrees": edge.agree,
            "treatment": normalize_shepards_to_treatment(edge.shepards),
        }

    def score(
        self, parsed: dict[str, Any], ground_truth: dict[str, Any]
    ) -> tuple[float, bool]:
        return _score_s5(parsed, ground_truth)


class S5DistinguishRAG(Step):
    """S5:rag - Distinguish using RAG."""

    @property
    def step_id(self) -> str:
        return "s5:rag"

    @property
    def step_name(self) -> str:
        return "s5"

    def requires(self) -> set[str]:
        return {"s1", "s4"}

    def check_coverage(self, ctx: ChainContext) -> bool:
        return ctx.instance.has_cited_text and ctx.instance.has_citing_text

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        """Build S5:rag prompt."""
        cited = ctx.instance.cited_case
        citing = ctx.instance.citing_case
        edge = ctx.instance.edge

        s4_result = ctx.get("s4")
        if s4_result and s4_result.parsed:
            disposition = s4_result.parsed.get("disposition", "unknown")
            party_winning = s4_result.parsed.get("party_winning", "unknown")
            holding = s4_result.parsed.get("holding_summary", "")
        else:
            disposition = "unknown"
            party_winning = "unknown"
            holding = ""

        citing_opinion = ""
        if citing and citing.majority_opinion:
            citing_opinion = citing.majority_opinion
            max_chars = 30000
            if len(citing_opinion) > max_chars:
                citing_opinion = citing_opinion[:max_chars] + "\n\n[TRUNCATED]"

        variables = {
            "cited_cite": cited.us_cite,
            "cited_name": cited.case_name,
            "cited_term": cited.term,
            "cited_disposition": disposition,
            "cited_party_winning": party_winning,
            "cited_holding": holding,
            "citing_cite": edge.citing_case_us_cite,
            "citing_name": edge.citing_case_name or (citing.case_name if citing else "Unknown"),
            "citing_opinion": citing_opinion,
            "treatment_enum": sorted(V2_TREATMENT_ENUM),
        }

        from core.prompts.resolver import resolve_prompt

        return resolve_prompt(
            name=self.step_id,
            variables=variables,
            fallback=S5_RAG_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        return _parse_s5_response(raw_response)

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        edge = ctx.instance.edge
        return {
            "agree": edge.agree,
            "agrees": edge.agree,
            "treatment": normalize_shepards_to_treatment(edge.shepards),
        }

    def score(
        self, parsed: dict[str, Any], ground_truth: dict[str, Any]
    ) -> tuple[float, bool]:
        return _score_s5(parsed, ground_truth)


def _parse_s5_response(raw_response: str) -> dict[str, Any]:
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

        predicted_treatment = data.get("predicted_treatment", None)
        predicted_agree = data.get("predicted_agree", None)
        reasoning = data.get("reasoning", "")
        evidence_quotes = data.get("evidence_quotes", [])

        if predicted_agree is None and "agrees" in data:
            predicted_agree = data.get("agrees")

        if isinstance(predicted_agree, str):
            predicted_agree = predicted_agree.lower() in ("true", "yes", "1")
        elif predicted_agree is None:
            predicted_agree = False
        else:
            predicted_agree = bool(predicted_agree)

        if isinstance(predicted_treatment, str):
            normalized_treatment = predicted_treatment.lower().strip()
            predicted_treatment = normalized_treatment if normalized_treatment in V2_TREATMENT_ENUM else None
        else:
            predicted_treatment = None

        if not isinstance(evidence_quotes, list):
            evidence_quotes = []
        evidence_quotes = [str(q) for q in evidence_quotes if q is not None]

        return {
            "predicted_treatment": predicted_treatment,
            "predicted_agree": predicted_agree,
            "agrees": predicted_agree,
            "reasoning": str(reasoning) if reasoning else "",
            "evidence_quotes": evidence_quotes,
        }

    except json.JSONDecodeError as e:
        return {"errors": [f"JSON parse error: {e}"]}


def _score_s5(parsed: dict[str, Any], ground_truth: dict[str, Any]) -> tuple[float, bool]:
    if "errors" in parsed:
        return (0.0, False)

    pred_agree = parsed.get("predicted_agree")
    if pred_agree is None and "agrees" in parsed:
        pred_agree = parsed.get("agrees")
    pred_agree = bool(pred_agree) if pred_agree is not None else False

    pred_treatment = parsed.get("predicted_treatment", None)
    true_agree = ground_truth.get("agree")
    if true_agree is None and "agrees" in ground_truth:
        true_agree = ground_truth.get("agrees")
    true_agree = bool(true_agree) if true_agree is not None else False

    true_treatment = ground_truth.get("treatment", None)

    agree_correct = pred_agree == true_agree
    has_treatment_gt = ("treatment" in ground_truth) and (true_treatment is not None)

    if not has_treatment_gt:
        return (1.0 if agree_correct else 0.0, agree_correct)

    treatment_correct = pred_treatment == true_treatment

    score = 0.0
    if agree_correct:
        score += 0.5
    if treatment_correct:
        score += 0.5

    return (score, agree_correct and treatment_correct)
