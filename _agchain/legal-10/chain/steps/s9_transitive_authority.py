"""S9: Transitive Authority (Proposed).

Strict adherence to Article III:
- Implements resolve_prompt
- Returns (text, obj, meta)
- Isolated from stable code
"""

from __future__ import annotations

import json
import re
from typing import Any

from chain.steps.base import Step
from core.prompts.resolver import resolve_prompt
from core.runtime.chain import ChainContext
from core.runtime.ground_truth import V2_TREATMENT_ENUM, normalize_shepards_to_treatment


S9_TREATMENT_OPTIONS_STR = ", ".join(sorted(V2_TREATMENT_ENUM))
DEFAULT_TOTAL_OPINION_BUDGET = 30000

POSITIVE_TREATMENTS = frozenset({"follows", "cites", "explains"})
NEGATIVE_TREATMENTS = frozenset({"distinguishes", "criticizes", "overrules", "questions", "limits"})


S9_CB_PROMPT_TEMPLATE = """You are analyzing a chain of legal precedent across three cases.

CASE A (Anchor - oldest authority):
- Citation: {anchor_cite}
- Name: {anchor_name}
- Year: {anchor_year}

CASE B (Middle - cites A):
- Citation: {middle_cite}
- Name: {middle_name}
- Year: {middle_year}
- Treatment of Case A: {treatment_ba}

CASE C (Newest - cites both A and B):
- Citation: {newest_cite}
- Name: {newest_name}
- Year: {newest_year}
- Treatment of Case B: {treatment_cb}

Based on this precedent chain, predict how Case C treated Case A.

Consider transitive reasoning:
- If B followed A, and C followed B, C likely follows A
- If B distinguished A, and C followed B, the relationship is less clear
- If B overruled A, that signal is strong regardless of C's treatment of B

Return a JSON object with:
- "predicted_treatment": one of [{treatment_options}]
- "predicted_agree": true if C agrees with A (follows/cites), false if C disagrees (distinguishes/criticizes/overrules)
- "reasoning": Brief explanation of your transitive reasoning

Return ONLY a JSON object. No other text."""


S9_RAG_PROMPT_TEMPLATE = """You are analyzing a chain of legal precedent across three cases.

CASE A (Anchor - oldest authority):
- Citation: {anchor_cite}
- Name: {anchor_name}
- Year: {anchor_year}

CASE A OPINION EXCERPT:
{anchor_opinion}

---

CASE B (Middle - cites A):
- Citation: {middle_cite}
- Name: {middle_name}
- Year: {middle_year}
- Treatment of Case A: {treatment_ba}

CASE B OPINION EXCERPT:
{middle_opinion}

---

CASE C (Newest - cites both A and B):
- Citation: {newest_cite}
- Name: {newest_name}
- Year: {newest_year}
- Treatment of Case B: {treatment_cb}

CASE C OPINION EXCERPT:
{newest_opinion}

---

Based on this precedent chain and the opinion texts, predict how Case C treated Case A.

Return a JSON object with:
- "predicted_treatment": one of [{treatment_options}]
- "predicted_agree": true if C agrees with A, false otherwise
- "reasoning": Explanation based on the opinion texts
- "evidence_quotes": Array of short supporting quotes from the opinions

Return ONLY a JSON object. No other text."""


class S9TransitiveAuthorityCB(Step):
    """S9:cb - Transitive Authority using backbone."""

    @property
    def step_id(self) -> str:
        return "s9:cb"

    @property
    def step_name(self) -> str:
        return "s9"

    def requires(self) -> set[str]:
        return set()

    def check_coverage(self, ctx: ChainContext) -> bool:
        return ctx.instance.triangle is not None

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        tri = ctx.instance.triangle
        anchor = ctx.instance.cited_case

        treatment_ba = normalize_shepards_to_treatment(tri.treatment_middle_anchor.shepards) or "cites"
        treatment_cb = normalize_shepards_to_treatment(tri.treatment_newest_middle.shepards) or "cites"

        variables = {
            "anchor_cite": anchor.us_cite,
            "anchor_name": anchor.case_name,
            "anchor_year": anchor.term,
            "middle_cite": tri.case_middle.us_cite,
            "middle_name": tri.case_middle.case_name,
            "middle_year": tri.case_middle.term,
            "treatment_ba": treatment_ba,
            "newest_cite": tri.case_newest.us_cite,
            "newest_name": tri.case_newest.case_name,
            "newest_year": tri.case_newest.term,
            "treatment_cb": treatment_cb,
            "treatment_options": S9_TREATMENT_OPTIONS_STR,
        }

        return resolve_prompt(
            name="s9:cb",
            variables=variables,
            fallback=S9_CB_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        return _parse_s9_response(raw_response)

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        tri = ctx.instance.triangle
        edge_ca = tri.treatment_newest_anchor
        return {
            "treatment": normalize_shepards_to_treatment(edge_ca.shepards),
            "agree": edge_ca.agree,
            "raw_shepards": edge_ca.shepards,
        }

    def score(self, parsed: dict[str, Any], ground_truth: dict[str, Any]) -> tuple[float, bool]:
        return _score_s9(parsed, ground_truth)


class S9TransitiveAuthorityRAG(Step):
    """S9:rag - Transitive Authority using RAG."""

    def __init__(self, total_opinion_budget: int = DEFAULT_TOTAL_OPINION_BUDGET) -> None:
        super().__init__()
        self._total_opinion_budget = total_opinion_budget

    @property
    def step_id(self) -> str:
        return "s9:rag"

    @property
    def step_name(self) -> str:
        return "s9"

    def requires(self) -> set[str]:
        return set()

    def check_coverage(self, ctx: ChainContext) -> bool:
        if ctx.instance.triangle is None:
            return False
        tri = ctx.instance.triangle
        anchor = ctx.instance.cited_case
        return (
            anchor.majority_opinion is not None
            and tri.case_middle.majority_opinion is not None
            and tri.case_newest.majority_opinion is not None
        )

    def prompt(self, ctx: ChainContext) -> tuple[str, Any, dict]:
        tri = ctx.instance.triangle
        anchor = ctx.instance.cited_case

        anchor_opinion, middle_opinion, newest_opinion = _distribute_opinion_budget(
            anchor.majority_opinion or "",
            tri.case_middle.majority_opinion or "",
            tri.case_newest.majority_opinion or "",
            total_budget=self._total_opinion_budget,
        )

        treatment_ba = normalize_shepards_to_treatment(tri.treatment_middle_anchor.shepards) or "cites"
        treatment_cb = normalize_shepards_to_treatment(tri.treatment_newest_middle.shepards) or "cites"

        variables = {
            "anchor_cite": anchor.us_cite,
            "anchor_name": anchor.case_name,
            "anchor_year": anchor.term,
            "anchor_opinion": anchor_opinion,
            "middle_cite": tri.case_middle.us_cite,
            "middle_name": tri.case_middle.case_name,
            "middle_year": tri.case_middle.term,
            "middle_opinion": middle_opinion,
            "treatment_ba": treatment_ba,
            "newest_cite": tri.case_newest.us_cite,
            "newest_name": tri.case_newest.case_name,
            "newest_year": tri.case_newest.term,
            "newest_opinion": newest_opinion,
            "treatment_cb": treatment_cb,
            "treatment_options": S9_TREATMENT_OPTIONS_STR,
        }

        return resolve_prompt(
            name="s9:rag",
            variables=variables,
            fallback=S9_RAG_PROMPT_TEMPLATE,
        )

    def parse(self, raw_response: str) -> dict[str, Any]:
        return _parse_s9_response(raw_response)

    def ground_truth(self, ctx: ChainContext) -> dict[str, Any]:
        tri = ctx.instance.triangle
        edge_ca = tri.treatment_newest_anchor
        return {
            "treatment": normalize_shepards_to_treatment(edge_ca.shepards),
            "agree": edge_ca.agree,
            "raw_shepards": edge_ca.shepards,
        }

    def score(self, parsed: dict[str, Any], ground_truth: dict[str, Any]) -> tuple[float, bool]:
        return _score_s9(parsed, ground_truth)


def _truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n[TRUNCATED]"


def _distribute_opinion_budget(anchor: str, middle: str, newest: str, total_budget: int) -> tuple[str, str, str]:
    total_len = len(anchor) + len(middle) + len(newest)
    if total_len <= total_budget:
        return anchor, middle, newest
    if total_len == 0:
        return "", "", ""

    newest_weight = 0.40
    remaining_weight = 0.60

    denom = (len(anchor) + len(middle))
    anchor_ratio = (len(anchor) / denom) if denom > 0 else 0.5
    anchor_weight = remaining_weight * anchor_ratio
    middle_weight = remaining_weight * (1 - anchor_ratio)

    anchor_budget = int(total_budget * anchor_weight)
    middle_budget = int(total_budget * middle_weight)
    newest_budget = total_budget - anchor_budget - middle_budget

    return (
        _truncate(anchor, max(anchor_budget, 500)),
        _truncate(middle, max(middle_budget, 500)),
        _truncate(newest, max(newest_budget, 500)),
    )


def _extract_json(text: str) -> str | None:
    text = text.strip()

    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass

    if "```" in text:
        pattern = r"```(?:json)?\s*([\s\S]*?)```"
        match = re.search(pattern, text)
        if match:
            candidate = match.group(1).strip()
            try:
                json.loads(candidate)
                return candidate
            except json.JSONDecodeError:
                pass

    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False

    for i, ch in enumerate(text[start:], start):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"' and not escape:
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = text[start : i + 1]
                try:
                    json.loads(candidate)
                    return candidate
                except json.JSONDecodeError:
                    return None

    return None


_TREATMENT_SYNONYMS: dict[str, str] = {
    "follow": "follows",
    "followed": "follows",
    "distinguish": "distinguishes",
    "distinguished": "distinguishes",
    "overrule": "overrules",
    "overruled": "overrules",
    "criticize": "criticizes",
    "criticized": "criticizes",
    "question": "questions",
    "questioned": "questions",
    "explain": "explains",
    "explained": "explains",
    "limit": "limits",
    "limited": "limits",
    "cite": "cites",
    "cited": "cites",
}


def _normalize_treatment_prediction(treatment: Any) -> str | None:
    if not isinstance(treatment, str):
        return None
    t = treatment.lower().strip()
    t = _TREATMENT_SYNONYMS.get(t, t)
    return t if t in V2_TREATMENT_ENUM else None


def _validate_coherence(parsed: dict[str, Any]) -> dict[str, Any]:
    treatment = parsed.get("predicted_treatment")
    agree = parsed.get("predicted_agree")
    if treatment is None or agree is None:
        return parsed

    warnings = parsed.get("warnings", [])
    if treatment in POSITIVE_TREATMENTS and agree is False:
        warnings.append(f"Incoherent: treatment '{treatment}' but predicted_agree=false")
    elif treatment in NEGATIVE_TREATMENTS and agree is True:
        warnings.append(f"Incoherent: treatment '{treatment}' but predicted_agree=true")

    if warnings:
        parsed["warnings"] = warnings
    return parsed


def _parse_s9_response(raw_response: str) -> dict[str, Any]:
    json_str = _extract_json(raw_response)
    if json_str is None:
        return {"errors": ["Could not extract JSON from response"]}

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        return {"errors": [f"JSON parse error: {e}"]}

    if not isinstance(data, dict):
        return {"errors": ["Response is not a JSON object"]}

    errors: list[str] = []
    warnings: list[str] = []

    if "predicted_treatment" not in data:
        errors.append("Missing predicted_treatment field")
        predicted_treatment = None
    else:
        raw_treatment = data.get("predicted_treatment")
        predicted_treatment = _normalize_treatment_prediction(raw_treatment)
        if predicted_treatment is None:
            warnings.append(f"Invalid treatment value: {raw_treatment!r}")

    if "predicted_agree" not in data:
        warnings.append("Missing predicted_agree field")
        predicted_agree = None
    else:
        raw_agree = data.get("predicted_agree")
        if isinstance(raw_agree, bool):
            predicted_agree = raw_agree
        elif isinstance(raw_agree, str):
            predicted_agree = raw_agree.lower() in ("true", "yes", "1")
        else:
            warnings.append(f"Invalid predicted_agree type: {type(raw_agree).__name__}")
            predicted_agree = None

    reasoning = data.get("reasoning", "")
    evidence_quotes = data.get("evidence_quotes", [])

    if not isinstance(evidence_quotes, list):
        evidence_quotes = []
    evidence_quotes = [str(q) for q in evidence_quotes if q]

    result: dict[str, Any] = {
        "predicted_treatment": predicted_treatment,
        "predicted_agree": predicted_agree,
        "reasoning": str(reasoning) if reasoning else "",
        "evidence_quotes": evidence_quotes,
    }

    if errors:
        result["errors"] = errors
    if warnings:
        result["warnings"] = warnings

    return _validate_coherence(result)


def _score_s9(parsed: dict[str, Any], ground_truth: dict[str, Any]) -> tuple[float, bool]:
    if "errors" in parsed:
        return (0.0, False)

    pred_treatment = parsed.get("predicted_treatment")
    pred_agree = parsed.get("predicted_agree")

    true_treatment = ground_truth.get("treatment")
    true_agree = ground_truth.get("agree", False)

    treatment_match = (
        pred_treatment is not None
        and true_treatment is not None
        and pred_treatment == true_treatment
    )

    agree_match = (pred_agree is not None) and (pred_agree == true_agree)

    score = 0.0
    if treatment_match:
        score += 0.5
    if agree_match:
        score += 0.5

    return (score, treatment_match and agree_match)
