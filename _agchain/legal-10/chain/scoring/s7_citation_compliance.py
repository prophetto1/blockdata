"""Deterministic citation compliance checks for S7.

Baseline intent:
- Score-only (no voiding): represent citation compliance as a 0.0-1.0 score plus flags.
- Cheap and deterministic: regex-based, no model calls.
"""

from __future__ import annotations

import re
from typing import Any


_DOC_REF_RE = re.compile(r"\[DOC\d+\]", flags=re.IGNORECASE)
_US_CITE_RE = re.compile(r"\b\d{1,3}\s+U\.?\s*S\.?\s+\d{1,4}\b", flags=re.IGNORECASE)


def score_s7_citation_compliance(*, s7_parsed: dict[str, Any]) -> dict[str, Any]:
    """Compute a simple deterministic citation compliance score for S7.

    Inputs:
      s7_parsed: Parsed S7 payload with IRAC keys (issue/rule/application/conclusion).

    Output:
      Dict with:
        - p_cite: float 0.0-1.0
        - has_doc_refs: bool (presence of "[DOC#]" references anywhere)
        - has_us_cites: bool (presence of literal U.S. Reports cites anywhere)
        - missing: list[str] of missing requirements
    """
    if not isinstance(s7_parsed, dict):
        return {
            "p_cite": 0.0,
            "has_doc_refs": False,
            "has_us_cites": False,
            "missing": ["invalid_parsed_type"],
        }

    text = "\n".join(
        str(s7_parsed.get(k, "") or "")
        for k in ("issue", "rule", "application", "conclusion")
    )

    has_doc_refs = bool(_DOC_REF_RE.search(text))
    has_us_cites = bool(_US_CITE_RE.search(text))

    score = 0.0
    if has_doc_refs:
        score += 0.5
    if has_us_cites:
        score += 0.5

    missing: list[str] = []
    if not has_doc_refs:
        missing.append("doc_refs")
    if not has_us_cites:
        missing.append("us_cites")

    return {
        "p_cite": float(score),
        "has_doc_refs": has_doc_refs,
        "has_us_cites": has_us_cites,
        "missing": missing,
    }

