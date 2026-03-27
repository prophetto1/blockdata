from __future__ import annotations

from pathlib import Path


def _read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def test_irac_steps_are_marked_judge_required() -> None:
    s6 = _read("chain/steps/s6_irac_synthesis.py")
    s7 = _read("chain/steps/s7_open_book_synthesis.py")

    assert "judge_required" in s6
    assert "mee_judge_required" in s6
    assert "judge_required" in s7


def test_irac_scoring_does_not_claim_deterministic_only() -> None:
    s6 = _read("chain/scoring/s6_composite.py")
    assert "DETERMINISTIC ONLY" not in s6

