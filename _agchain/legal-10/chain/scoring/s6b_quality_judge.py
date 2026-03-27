"""MEE-style quality judge for IRAC synthesis.

This module runs the *judge model* (in an isolated session) to grade an IRAC
submission against contextual anchors and returns a normalized `quality_index`.

Canonical reference: `internal/specs/steps/irac_synthesis.md`.
"""

from __future__ import annotations

import os
import json
from dataclasses import dataclass
from typing import Any

from core.backends.base import Backend


MEE_RUBRIC_PROMPT_TEMPLATE = """You are a senior legal editor auditing a professional IRAC memo.

To perform a high-fidelity audit, you are provided with two sets of information:
1. CONTEXTUAL ANCHORS: The verified ground truth facts/rules of the case.
2. CANDIDATE SUBMISSION: The analysis produced by the model.

Your task is to score the SUBMISSION against the ANCHORS using the MEE analytic rubric.

---
CONTEXTUAL ANCHORS (The Truth):
- Case Holding: {anchor_holding}
- Core Legal Rule: {anchor_rule}
- Disposition: {anchor_disposition}
- Relationship to Citing Case: {anchor_relationship}

---
CANDIDATE SUBMISSION (The Draft to Grade):
ISSUE: {issue}
RULE: {rule}
APPLICATION: {application}
CONCLUSION: {conclusion}
---

REQUIRED GRADING CRITERIA (0-6 Scale):

1. ISSUE FRAMING: Accuracy relative to the Anchor Holding.
2. RULE ACCURACY: Alignment with the Anchor Legal Rule.
3. APPLICATION DEPTH: How well the candidate bridged the Anchor Facts to the Rule.
4. CONCLUSION SUPPORT: Logical validity relative to the Anchor Disposition.

Respond in JSON format only:
{{
  "issue_score": <0-6>,
  "rule_score": <0-6>,
  "application_score": <0-6>,
  "conclusion_score": <0-6>,
  "reasoning": "<justification citing specific discrepancies with the Anchors>"
}}
"""

@dataclass(frozen=True)
class MEEScore:
    """MEE-style scores for IRAC quality."""
    issue_score: int
    rule_score: int
    application_score: int
    conclusion_score: int
    reasoning: str

    @property
    def quality_index(self) -> float:
        """Normalize the total quality score to 0.0-1.0."""
        # Baseline MEE sum: 24 points max (6 * 4)
        total = self.issue_score + self.rule_score + self.application_score + self.conclusion_score
        return float(total) / 24.0

def run_mee_judge(
    *,
    backend: Backend,
    s6_parsed: dict[str, Any],
    anchors: dict[str, str],
) -> dict[str, Any]:
    """Execute the MEE-style quality rubric judge call with Contextual Anchors."""
    
    prompt = MEE_RUBRIC_PROMPT_TEMPLATE.format(
        anchor_holding=anchors.get("holding", "N/A"),
        anchor_rule=anchors.get("rule", "N/A"),
        anchor_disposition=anchors.get("disposition", "N/A"),
        anchor_relationship=anchors.get("relationship", "N/A"),
        issue=s6_parsed.get("issue", ""),
        rule=s6_parsed.get("rule", ""),
        application=s6_parsed.get("application", ""),
        conclusion=s6_parsed.get("conclusion", ""),
    )

    raw = backend.complete(prompt)
    
    try:
        # Simple extraction (assuming backend returns clean JSON or we'd need _strip_code_fences)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("\n", 1)[0].replace("json", "").strip()
        
        data = json.loads(cleaned)
        
        score = MEEScore(
            issue_score=int(data["issue_score"]),
            rule_score=int(data["rule_score"]),
            application_score=int(data["application_score"]),
            conclusion_score=int(data["conclusion_score"]),
            reasoning=data.get("reasoning", ""),
        )

        return {
            "status": "OK",
            "model": backend.model_id,
            "quality_index": score.quality_index,
            "raw_scores": {
                "issue": score.issue_score,
                "rule": score.rule_score,
                "application": score.application_score,
                "conclusion": score.conclusion_score,
            },
            "reasoning": score.reasoning
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "error": str(e),
            "raw_response": raw
        }
