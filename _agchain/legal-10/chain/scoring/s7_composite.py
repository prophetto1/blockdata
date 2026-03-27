"""Scoring for S7 open-book IRAC (legacy step ID).

Canonical naming (spec): this corresponds to **j7 (open-book IRAC)**.

Important alignment:
- IRAC quality is **judge-scored** (MEE-style) and the judge is **required**.
- Deterministic checks (schema/structure, citation compliance, etc.) are tracked
  as *separate metrics/flags*, not as substitutes for the judge score.

See: `internal/specs/steps/irac_synthesis.md`.
"""

from __future__ import annotations

from typing import Any

from core.backends.base import Backend
from core.runtime.chain import ChainContext
from chain.scoring.irac_rubric import score_irac_presence
from chain.scoring.mee_anchors import derive_contextual_anchors_for_mee
from chain.scoring.s6b_quality_judge import run_mee_judge
from chain.scoring.s7_citation_compliance import score_s7_citation_compliance


def score_s7_composite(
    *,
    ctx: ChainContext,
    s7_parsed: dict[str, Any],
    judge_backend: Backend | None,
) -> dict[str, Any]:
    """Score S7 (canonical: j7) and return a serializable score dict.

    The primary score for this step is the MEE-style judge score.
    Deterministic checks are included as separate fields.
    """
    if judge_backend is None:
        raise ValueError("judge_backend is REQUIRED for S7 scoring")

    parse_success = isinstance(s7_parsed, dict) and ("errors" not in s7_parsed)

    if parse_success:
        p_struct, _present = score_irac_presence(s7_parsed)
        cite = score_s7_citation_compliance(s7_parsed=s7_parsed)
        p_cite = float(cite.get("p_cite", 0.0))
    else:
        p_struct = 0.0
        cite = score_s7_citation_compliance(s7_parsed={})
        p_cite = 0.0

    judge_failed = False
    if not parse_success:
        mee = {"status": "NOT_RUN"}
        p_mee = 0.0
    else:
        anchors = derive_contextual_anchors_for_mee(ctx=ctx)
        mee = run_mee_judge(backend=judge_backend, s6_parsed=s7_parsed, anchors=anchors)
        if mee.get("status") == "OK":
            p_mee = float(mee.get("quality_index", 0.0))
        else:
            p_mee = 0.0
            judge_failed = True

    # Canonical spec: judge score is the IRAC quality score.
    total = float(max(0.0, min(1.0, p_mee if parse_success else 0.0)))

    return {
        "s7_composite": {
            "phase1_structural": round(float(p_struct), 6),
            "phase2_citation_compliance": round(float(p_cite), 6),
            "phase3_mee_judge": round(float(p_mee), 6),
            "total": round(float(total), 6),
            "judge_required": True,
            "judge_failed": bool(judge_failed),
        },
        "citation_compliance": cite,
        "mee_judge": mee,
        "parse_success": bool(parse_success),
    }
