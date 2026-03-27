from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable


_RE_US = re.compile(
    r"\b(?P<vol>\d{1,3})\s+U\.?\s*S\.?\s+(?P<page>\d{1,4})\b",
    re.IGNORECASE,
)

_NOMINATIVE_REPORTERS = r"(?:Pet|Wheat|Cranch|Cr|How|Wall|Black|Dall)"
_RE_US_NOMINATIVE = re.compile(
    r"\b(?P<vol>\d{1,3})\s+U\.?\s*S\.?\s+"
    r"(?P<nom_vol>\d{1,2})\s*" + _NOMINATIVE_REPORTERS + r"\.?\s*"
    r"(?P<page>\d{1,4})\b",
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


@dataclass(frozen=True)
class _FoundCite:
    start: int
    end: int
    normalized: str


def _canonical_key(cite: str) -> str:
    # Canonical comparison key: strip punctuation, collapse whitespace, lowercase.
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


def _extract_in_scope_cites_from_text(text: str) -> list[str]:
    found: list[_FoundCite] = []

    # Nominative U.S. reporter form (e.g., "35 U.S. 10 Pet. 368") must be extracted
    # before plain U.S. matching so we don't mis-parse "35 U.S. 10".
    for m in _RE_US_NOMINATIVE.finditer(text):
        found.append(_FoundCite(m.start(), m.end(), _norm_us(m.group("vol"), m.group("page"))))

    for m in _RE_US.finditer(text):
        # Avoid double-counting where nominative already matched.
        if any(not (m.end() <= f.start or m.start() >= f.end) for f in found):
            continue
        found.append(_FoundCite(m.start(), m.end(), _norm_us(m.group("vol"), m.group("page"))))

    for m in _RE_F_SUPP.finditer(text):
        found.append(
            _FoundCite(
                m.start(),
                m.end(),
                _norm_f_supp(m.group("vol"), m.group("series"), m.group("page")),
            )
        )

    for m in _RE_F_SERIES.finditer(text):
        found.append(
            _FoundCite(
                m.start(),
                m.end(),
                _norm_f_series(m.group("vol"), m.group("series"), m.group("page")),
            )
        )

    for m in _RE_F_PLAIN.finditer(text):
        # Avoid double-counting where a more specific regex already matched.
        if any(not (m.end() <= f.start or m.start() >= f.end) for f in found):
            continue
        found.append(_FoundCite(m.start(), m.end(), _norm_f_plain(m.group("vol"), m.group("page"))))

    found.sort(key=lambda x: (x.start, x.end))
    return _dedupe_preserve_order([f.normalized for f in found])


def _extract_citations_list(
    irac: dict[str, Any],
    *,
    citations_field: str,
    errors: list[str],
    label: str,
) -> tuple[list[str], list[str]]:
    """
    Returns (citations_used_in_scope, out_of_scope_raw_entries).
    """
    out_of_scope: list[str] = []

    if citations_field in irac and isinstance(irac.get(citations_field), list):
        raw_list = irac.get(citations_field) or []
        citations_used: list[str] = []
        for raw in raw_list:
            if not isinstance(raw, str):
                errors.append(f"{label}: non-string entry in `{citations_field}` list")
                continue
            in_scope = _extract_in_scope_cites_from_text(raw)
            if in_scope:
                citations_used.extend(in_scope)
            else:
                out_of_scope.append(raw)
        return (_dedupe_preserve_order(citations_used), out_of_scope)

    errors.append(f"{label}: missing or non-list `{citations_field}`; using fallback text extraction")
    text_parts: list[str] = []
    for key in ("issue", "rule", "application", "conclusion"):
        val = irac.get(key)
        if isinstance(val, str) and val.strip():
            text_parts.append(val)
    combined = "\n".join(text_parts)
    return (_extract_in_scope_cites_from_text(combined), out_of_scope)


def _validity(used: list[str], inventory: list[str]) -> dict[str, Any]:
    inventory_keys = {_canonical_key(c) for c in inventory}
    valid: list[str] = []
    invalid: list[str] = []
    for cite in used:
        if _canonical_key(cite) in inventory_keys:
            valid.append(cite)
        else:
            invalid.append(cite)
    return {
        "valid": valid,
        "invalid": invalid,
        "valid_count": len(valid),
        "invalid_count": len(invalid),
    }


def _rp_usage(used: list[str], rp_subset: list[str]) -> dict[str, Any]:
    rp_keys = {_canonical_key(c) for c in rp_subset}
    in_rp: list[str] = []
    not_in_rp: list[str] = []
    for cite in used:
        if _canonical_key(cite) in rp_keys:
            in_rp.append(cite)
        else:
            not_in_rp.append(cite)
    return {
        "in_rp": in_rp,
        "not_in_rp": not_in_rp,
        "in_rp_count": len(in_rp),
        "not_in_rp_count": len(not_in_rp),
    }


def score_citation_integrity(
    *,
    irac_d9: dict[str, Any] | None = None,
    irac_j10: dict[str, Any] | None = None,
    irac_no_rp: dict[str, Any] | None = None,
    irac_with_rp: dict[str, Any] | None = None,
    anchor_inventory_full: list[str],
    rp_subset: list[str],
    citations_field: str = "citations",
) -> dict[str, Any]:
    """
    Deterministically score citation usage in the two IRAC outputs produced by steps
    `d9` (closed-book IRAC) and `j10` (open-book IRAC).

    Primary extraction source: `citations_field` list in each IRAC dict.
    Fallback: regex extraction from IRAC text fields (issue/rule/application/conclusion).
    """
    errors: list[str] = []

    # Back-compat with the 3-step slice signature.
    if irac_d9 is None:
        irac_d9 = irac_no_rp
    if irac_j10 is None:
        irac_j10 = irac_with_rp
    if irac_d9 is None or irac_j10 is None:
        raise ValueError("score_citation_integrity requires IRAC outputs for steps d9 and j10")

    citations_used_d9, out_of_scope_d9 = _extract_citations_list(
        irac_d9, citations_field=citations_field, errors=errors, label="d9"
    )
    citations_used_j10, out_of_scope_j10 = _extract_citations_list(
        irac_j10, citations_field=citations_field, errors=errors, label="j10"
    )

    validity_d9 = _validity(citations_used_d9, anchor_inventory_full)
    validity_j10 = _validity(citations_used_j10, anchor_inventory_full)

    rp_usage_j10 = _rp_usage(citations_used_j10, rp_subset)

    combined_used = _dedupe_preserve_order([*citations_used_d9, *citations_used_j10])
    combined_validity = _validity(combined_used, anchor_inventory_full)

    return {
        "citations_used_d9": citations_used_d9,
        "citations_used_j10": citations_used_j10,
        "anchor_inventory": anchor_inventory_full,
        "rp_subset": rp_subset,
        "anchor_validity": {
            "d9": validity_d9,
            "j10": validity_j10,
            "combined": combined_validity,
        },
        "rp_usage": {
            "j10": rp_usage_j10,
        },
        "out_of_scope": {
            "d9": out_of_scope_d9,
            "j10": out_of_scope_j10,
        },
        "errors": errors,
    }
