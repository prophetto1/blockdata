"""Deterministic scorer for d1 (Known Authority - SCOTUS).

Scores 4 sub-questions with equal weight (0.25 each):
- controlling_authority: exact match
- in_favor: F1 score
- against: F1 score
- most_frequent: exact match
"""

from __future__ import annotations

import re
from typing import Any, Iterable

_NOMINATIVE_REPORTERS = r"(?:Pet|Wheat|Cranch|Cr|How|Wall|Black|Dall)"
_RE_US_NOMINATIVE = re.compile(
    r"\b(?P<vol>\d{1,3})\s+U\.?\s*S\.?\s+"
    r"(?P<nom_vol>\d{1,2})\s*" + _NOMINATIVE_REPORTERS + r"\.?\s*"
    r"(?P<page>\d{1,4})\b",
    re.IGNORECASE,
)
_RE_US = re.compile(
    r"\b(?P<vol>\d{1,3})\s+U\.?\s*S\.?\s+(?P<page>\d{1,4})\b",
    re.IGNORECASE,
)
_RE_F_SERIES = re.compile(
    r"\b(?P<vol>\d{1,4})\s+F\.?\s*(?P<series>2d|3d)\s+(?P<page>\d{1,4})\b",
    re.IGNORECASE,
)
_RE_F_SUPP = re.compile(
    r"\b(?P<vol>\d{1,4})\s+F\.?\s*Supp\.?\s*(?P<series>2d|3d)?\s+(?P<page>\d{1,4})\b",
    re.IGNORECASE,
)
_RE_F_PLAIN = re.compile(
    r"\b(?P<vol>\d{1,4})\s+F\.\s+(?P<page>\d{1,4})\b",
    re.IGNORECASE,
)


def _norm_us(vol: str, page: str) -> str:
    return f"{int(vol)} U.S. {int(page)}"


def _norm_f_series(vol: str, series: str, page: str) -> str:
    return f"{int(vol)} F.{series.lower()} {int(page)}"


def _norm_f_supp(vol: str, series: str | None, page: str) -> str:
    if not series:
        reporter = "F. Supp."
    else:
        reporter = f"F. Supp. {series.lower()}"
    return f"{int(vol)} {reporter} {int(page)}"


def _norm_f_plain(vol: str, page: str) -> str:
    return f"{int(vol)} F. {int(page)}"


def _canonical_key(cite: str) -> str:
    c = cite.strip().lower()
    c = re.sub(r"[.,]", "", c)
    c = re.sub(r"\s+", " ", c)
    return c


def _dedupe_preserve_order(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = _canonical_key(item)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def extract_in_scope_citations(text: str) -> list[str]:
    """Extract normalized in-scope citations from text.

    In-scope: U.S., F., F.2d/F.3d, F. Supp., F. Supp. 2d/3d.
    Matches datasets/citation_inventory.parquet normalization conventions.
    """
    found: list[tuple[int, int, str]] = []

    for m in _RE_US_NOMINATIVE.finditer(text):
        found.append((m.start(), m.end(), _norm_us(m.group("vol"), m.group("page"))))

    for m in _RE_US.finditer(text):
        if any(not (m.end() <= s or m.start() >= e) for s, e, _ in found):
            continue
        found.append((m.start(), m.end(), _norm_us(m.group("vol"), m.group("page"))))

    for m in _RE_F_SUPP.finditer(text):
        found.append(
            (
                m.start(),
                m.end(),
                _norm_f_supp(m.group("vol"), m.group("series"), m.group("page")),
            )
        )

    for m in _RE_F_SERIES.finditer(text):
        found.append(
            (
                m.start(),
                m.end(),
                _norm_f_series(m.group("vol"), m.group("series"), m.group("page")),
            )
        )

    for m in _RE_F_PLAIN.finditer(text):
        if any(not (m.end() <= s or m.start() >= e) for s, e, _ in found):
            continue
        found.append((m.start(), m.end(), _norm_f_plain(m.group("vol"), m.group("page"))))

    found.sort(key=lambda t: (t[0], t[1]))
    return _dedupe_preserve_order([c for _, __, c in found])


def _extract_answer(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return extract_in_scope_citations(value)
    if isinstance(value, list):
        out: list[str] = []
        for item in value:
            if isinstance(item, str):
                out.extend(extract_in_scope_citations(item))
        return _dedupe_preserve_order(out)
    return []


def _get_gt(ground_truth: dict[str, Any], key: str) -> Any:
    if key in ground_truth:
        return ground_truth.get(key)
    ka = ground_truth.get("known_authority")
    if isinstance(ka, dict) and key in ka:
        return ka.get(key)
    return None


def score_d1_known_authority(
    *,
    d1_output: dict[str, Any],
    ground_truth: dict[str, Any],
) -> dict[str, Any]:
    """Score Known Authority (d1) deterministically.

    Expected fields in d1_output:
    - controlling_authority: str (one citation)
    - in_favor: list[str]
    - against: list[str]
    - most_frequent: str (one citation)

    Ground truth same keys (top-level or under `known_authority`).
    """
    errors: list[str] = []

    controlling_pred = _extract_answer(d1_output.get("controlling_authority"))
    in_favor_pred = _extract_answer(d1_output.get("in_favor"))
    against_pred = _extract_answer(d1_output.get("against"))
    most_frequent_pred = _extract_answer(d1_output.get("most_frequent"))

    controlling_true = _extract_answer(_get_gt(ground_truth, "controlling_authority"))
    in_favor_true = _extract_answer(_get_gt(ground_truth, "in_favor"))
    against_true = _extract_answer(_get_gt(ground_truth, "against"))
    most_frequent_true = _extract_answer(_get_gt(ground_truth, "most_frequent"))

    def first_or_none(values: list[str]) -> str | None:
        return values[0] if values else None

    controlling_ok = (
        first_or_none(controlling_pred) is not None
        and first_or_none(controlling_true) is not None
        and _canonical_key(first_or_none(controlling_pred) or "")
        == _canonical_key(first_or_none(controlling_true) or "")
    )
    most_frequent_ok = (
        first_or_none(most_frequent_pred) is not None
        and first_or_none(most_frequent_true) is not None
        and _canonical_key(first_or_none(most_frequent_pred) or "")
        == _canonical_key(first_or_none(most_frequent_true) or "")
    )

    def f1(pred: list[str], truth: list[str]) -> dict[str, Any]:
        pred_keys = {_canonical_key(c) for c in pred}
        truth_keys = {_canonical_key(c) for c in truth}
        if not pred_keys and not truth_keys:
            return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "tp": [], "fp": [], "fn": []}
        if not pred_keys and truth_keys:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "tp": [], "fp": [], "fn": truth}
        if pred_keys and not truth_keys:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "tp": [], "fp": pred, "fn": []}

        tp_keys = pred_keys & truth_keys
        fp_keys = pred_keys - truth_keys
        fn_keys = truth_keys - pred_keys

        precision = len(tp_keys) / (len(tp_keys) + len(fp_keys)) if (tp_keys or fp_keys) else 0.0
        recall = len(tp_keys) / (len(tp_keys) + len(fn_keys)) if (tp_keys or fn_keys) else 0.0
        f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

        tp = [c for c in pred if _canonical_key(c) in tp_keys]
        fp = [c for c in pred if _canonical_key(c) in fp_keys]
        fn = [c for c in truth if _canonical_key(c) in fn_keys]

        return {
            "precision": precision,
            "recall": recall,
            "f1": f1_score,
            "tp": tp,
            "fp": fp,
            "fn": fn,
        }

    in_favor_metrics = f1(in_favor_pred, in_favor_true)
    against_metrics = f1(against_pred, against_true)

    score_components = [
        1.0 if controlling_ok else 0.0,
        float(in_favor_metrics["f1"]),
        float(against_metrics["f1"]),
        1.0 if most_frequent_ok else 0.0,
    ]
    score = sum(score_components) / 4.0

    if first_or_none(controlling_true) is None:
        errors.append("missing ground truth: controlling_authority")
    if first_or_none(most_frequent_true) is None:
        errors.append("missing ground truth: most_frequent")

    return {
        "score": score,
        "correct": score >= 0.75,
        "details": {
            "controlling_authority": {
                "pred": first_or_none(controlling_pred),
                "truth": first_or_none(controlling_true),
                "ok": controlling_ok,
            },
            "in_favor": in_favor_metrics,
            "against": against_metrics,
            "most_frequent": {
                "pred": first_or_none(most_frequent_pred),
                "truth": first_or_none(most_frequent_true),
                "ok": most_frequent_ok,
            },
        },
        "errors": errors,
    }
