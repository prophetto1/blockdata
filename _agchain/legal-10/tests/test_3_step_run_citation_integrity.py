from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def _load_citation_integrity_module():
    repo_root = Path(__file__).resolve().parents[1]
    module_path = (
        repo_root / "runspecs" / "3-STEP-RUN" / "scorers" / "citation_integrity.py"
    )
    if not module_path.exists():
        raise AssertionError(f"Missing module file: {module_path}")

    spec = importlib.util.spec_from_file_location("citation_integrity_3_step_run", module_path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Failed to load module spec for: {module_path}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_score_citation_integrity_basic_validity_and_rp_usage() -> None:
    mod = _load_citation_integrity_module()

    irac_no_rp = {
        "citations": [
            "Norton v. Shelby County, 118 U. S. 425",
            "122 Fla. 454",
            "84 F.2d 285, 287",
        ]
    }
    irac_with_rp = {"citations": ["268 U.S. 397", "84 F.2d 285"]}

    anchor_inventory_full = ["118 U.S. 425", "268 U.S. 397", "84 F.2d 285"]
    rp_subset = ["84 F.2d 285"]

    out = mod.score_citation_integrity(
        irac_no_rp=irac_no_rp,
        irac_with_rp=irac_with_rp,
        anchor_inventory_full=anchor_inventory_full,
        rp_subset=rp_subset,
        citations_field="citations",
    )

    assert out["citations_used_d9"] == ["118 U.S. 425", "84 F.2d 285"]
    assert out["citations_used_j10"] == ["268 U.S. 397", "84 F.2d 285"]

    assert out["anchor_validity"]["d9"]["invalid"] == []
    assert out["anchor_validity"]["j10"]["invalid"] == []

    assert out["rp_usage"]["j10"]["in_rp"] == ["84 F.2d 285"]
    assert out["rp_usage"]["j10"]["not_in_rp"] == ["268 U.S. 397"]

    assert out["out_of_scope"]["d9"] == ["122 Fla. 454"]
    assert out["errors"] == []


def test_score_citation_integrity_falls_back_when_citations_field_missing() -> None:
    mod = _load_citation_integrity_module()

    irac_no_rp = {
        "issue": "The question is controlled by Norton v. Shelby County, 118 U.S. 425.",
        "rule": "See also 84 F.2d 285.",
        "application": "",
        "conclusion": "",
    }
    irac_with_rp = {"citations": ["118 U.S. 425"]}

    anchor_inventory_full = ["118 U.S. 425", "84 F.2d 285"]
    rp_subset = ["118 U.S. 425"]

    out = mod.score_citation_integrity(
        irac_no_rp=irac_no_rp,
        irac_with_rp=irac_with_rp,
        anchor_inventory_full=anchor_inventory_full,
        rp_subset=rp_subset,
        citations_field="citations",
    )

    assert out["citations_used_d9"] == ["118 U.S. 425", "84 F.2d 285"]
    assert any("fallback" in e.lower() or "missing" in e.lower() for e in out["errors"])


def test_score_citation_integrity_handles_nominative_us_reports_format() -> None:
    mod = _load_citation_integrity_module()

    irac_no_rp = {"citations": ["35 U.S. 10 Pet. 368"]}
    irac_with_rp = {"citations": []}

    out = mod.score_citation_integrity(
        irac_no_rp=irac_no_rp,
        irac_with_rp=irac_with_rp,
        anchor_inventory_full=["35 U.S. 368"],
        rp_subset=[],
        citations_field="citations",
    )

    assert out["citations_used_d9"] == ["35 U.S. 368"]
    assert out["anchor_validity"]["d9"]["invalid"] == []
