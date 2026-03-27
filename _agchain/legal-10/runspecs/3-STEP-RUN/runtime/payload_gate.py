"""PayloadGate: admits only the payloads specified by plan.json inject_payloads."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def get_admitted_payloads(
    step: dict[str, Any],
    eu_dir: Path,
) -> dict[str, dict[str, Any]]:
    """Load and return only the payloads admitted for this step.

    Args:
        step: A step dict from plan.json (must have 'inject_payloads').
        eu_dir: Path to the EU directory (contains p1.json, p2.json, etc.).

    Returns:
        Dict mapping payload_id -> parsed JSON content.
    """
    admitted: dict[str, dict[str, Any]] = {}
    for payload_id in step.get("inject_payloads", []):
        path = eu_dir / f"{payload_id}.json"
        if not path.exists():
            raise FileNotFoundError(f"Admitted payload not found: {path}")
        admitted[payload_id] = json.loads(path.read_text(encoding="utf-8"))
    return admitted
