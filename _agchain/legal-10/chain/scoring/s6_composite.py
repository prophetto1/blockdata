"""Scoring for S6 closed-book IRAC (legacy step ID).

Canonical naming (spec): this corresponds to **j6 (closed-book IRAC)**.

Important alignment:
- IRAC quality is **judge-scored** (MEE-style) and the judge is **required**.
- Deterministic checks (structure, chain-consistency, etc.) are tracked as
  separate metrics/flags, not as substitutes for the judge score.

See: `internal/specs/steps/irac_synthesis.md`.
"""

from __future__ import annotations

from typing import Any

from core.backends.base import Backend
from core.runtime.chain import ChainContext
from chain.scoring.irac_rubric import score_irac_presence
from chain.scoring.mee_anchors import derive_contextual_anchors_for_mee
from chain.scoring.s6_chain_consistency import score_phase2_chain_consistency
from chain.scoring.s6b_quality_judge import run_mee_judge

def _s6_mode_from_ctx(ctx: ChainContext) -> str:
    """Determine S6 mode A/B for relationship context."""
    s5 = ctx.get("s5:cb")
    if s5 is None or s5.status != "OK" or not isinstance(s5.parsed, dict):
        return "A"

    agrees = s5.parsed.get("predicted_agree")
    if agrees is None and "agrees" in s5.parsed:
        agrees = s5.parsed.get("agrees")
    return "B" if isinstance(agrees, bool) else "A"


def score_s6_composite(
    *,
    ctx: ChainContext,
    s6_parsed: dict[str, Any],
    judge_backend: Backend | None,
) -> dict[str, Any]:
    """Score S6 (canonical: j6) and return a serializable score dict."""
    if judge_backend is None:
        raise ValueError("judge_backend is REQUIRED for S6 scoring")

    mode = _s6_mode_from_ctx(ctx)
    trace_handle = getattr(ctx, "trace_handle", None)

    parse_success = "errors" not in s6_parsed

    # Phase 1: structural presence (schema-ish compliance)
    if parse_success:
        p_struct, _present = score_irac_presence(s6_parsed)
    else:
        p_struct = 0.0

    # Phase 2: chain consistency (deterministic cross-checks)
    if parse_success:
        phase2 = score_phase2_chain_consistency(ctx=ctx, s6_parsed=s6_parsed)
        p_consistency = float(phase2["phase2_score"])
        phase2_coverage = float(phase2["phase2_coverage"])
    else:
        phase2 = {"expected": 4, "passed": 0, "possible": 0, "phase2_score": 0.0, "phase2_coverage": 0.0, "checks": {}}
        p_consistency = 0.0
        phase2_coverage = 0.0

    # Phase 3: MEE judge (required)
    judge_failed = False
    if not parse_success:
        mee = {"status": "NOT_RUN"}
        p_mee = 0.0
    else:
        anchors = derive_contextual_anchors_for_mee(ctx=ctx)
        mee = run_mee_judge(backend=judge_backend, s6_parsed=s6_parsed, anchors=anchors)
        if mee.get("status") == "OK":
            p_mee = float(mee.get("quality_index", 0.0))
        else:
            p_mee = 0.0
            judge_failed = True

    # Canonical spec: judge score is the IRAC quality score.
    total = float(max(0.0, min(1.0, p_mee if parse_success else 0.0)))
    
    # Trace sub-scores if handle available
    if trace_handle:
        try:
            trace_handle.score(name="s6-structure", value=p_struct)
            trace_handle.score(name="s6-consistency", value=p_consistency)
            trace_handle.score(name="s6-mee-judge", value=p_mee)
        except Exception:
            pass

    return {
        "s6_composite": {
            "s6_mode": mode,
            "phase1_structural": round(p_struct, 6),
            "phase2_chain_consistency": round(p_consistency, 6),
            "phase3_mee_judge": round(float(p_mee), 6),
            "total": round(total, 6),
            "phase2_coverage": round(phase2_coverage, 6),
            "judge_required": True,
            "judge_failed": bool(judge_failed),
        },
        "phase2_checks": phase2,
        "mee_judge": mee,
        "parse_success": bool(parse_success),
    }
