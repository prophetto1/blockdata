from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Mapping

SESSION_TYPE_KEYS: tuple[str, ...] = (
    "vscode.cc.cli",
    "vscode.cdx.cli",
    "vscode.cc.ide-panel",
    "vscode.cdx.ide-panel",
    "claude-desktop.cc",
    "codex-app-win.cdx",
    "terminal.cc",
    "terminal.cdx",
    "unknown",
)
CONTAINER_HOSTS: frozenset[str] = frozenset(
    {"vscode", "claude-desktop", "codex-app-win", "terminal", "unknown"}
)
INTERACTION_SURFACES: frozenset[str] = frozenset({"cli", "ide-panel", "desktop-app", "unknown"})
RUNTIME_PRODUCTS: frozenset[str] = frozenset({"cc", "cdx", "unknown"})
CLASSIFICATION_PROVENANCE_KEYS: tuple[str, ...] = (
    "launch_stamped",
    "runtime_observed",
    "configured",
    "inferred",
    "unknown",
)
REGISTRY_PATH = (
    Path(__file__).resolve().parents[5]
    / "tools"
    / "coordination"
    / "session-classification-registry.v1.json"
)

_cached_registry: dict[str, Any] | None = None


def _clone(value: Any) -> Any:
    return json.loads(json.dumps(value))


def _normalize_enum(value: Any, allowed: frozenset[str]) -> str:
    if not isinstance(value, str):
        return "unknown"
    normalized = value.strip().lower()
    if not normalized or normalized not in allowed:
        return "unknown"
    return normalized


def _normalize_provenance(value: Any) -> str:
    if not isinstance(value, str):
        return "unknown"
    normalized = value.strip().lower()
    if normalized not in CLASSIFICATION_PROVENANCE_KEYS:
        return "unknown"
    return normalized


def _display_label_for(key: str, registry: Mapping[str, Any]) -> str:
    entry = registry["session_types"].get(key) or registry["session_types"]["unknown"]
    return entry["display_label"]


def _raw_classification(payload: Mapping[str, Any] | None) -> Mapping[str, Any] | None:
    if not isinstance(payload, Mapping):
        return None

    details = payload.get("details")
    if isinstance(details, Mapping):
        classification = details.get("sessionClassification")
        if isinstance(classification, Mapping):
            return classification

    if any(
        key in payload
        for key in (
            "key",
            "containerHost",
            "interactionSurface",
            "runtimeProduct",
            "classified",
            "registryVersion",
            "reason",
            "provenance",
        )
    ):
        return payload

    return None


def load_session_classification_registry(*, force_reload: bool = False) -> dict[str, Any]:
    global _cached_registry
    if _cached_registry is None or force_reload:
        with REGISTRY_PATH.open("r", encoding="utf-8") as handle:
            _cached_registry = json.load(handle)
    return _clone(_cached_registry)


def empty_session_classification_summary() -> dict[str, Any]:
    return {
        "classified_count": 0,
        "unknown_count": 0,
        "counts_by_type": {key: 0 for key in SESSION_TYPE_KEYS},
        "counts_by_provenance": {key: 0 for key in CLASSIFICATION_PROVENANCE_KEYS},
    }


def serialize_session_classification(
    payload: Mapping[str, Any] | None,
    *,
    registry: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    active_registry = registry or load_session_classification_registry()
    raw = _raw_classification(payload)
    raw_provenance = raw.get("provenance") if isinstance(raw, Mapping) else None
    provenance = raw_provenance if isinstance(raw_provenance, Mapping) else {}

    raw_key = raw.get("key") if isinstance(raw, Mapping) else None
    key = raw_key if isinstance(raw_key, str) and raw_key in active_registry["session_types"] else "unknown"
    classified = key != "unknown"

    if classified:
        registry_entry = active_registry["session_types"][key]
        container_host = registry_entry["container_host"]
        interaction_surface = registry_entry["interaction_surface"]
        runtime_product = registry_entry["runtime_product"]
        reason = None
    else:
        container_host = _normalize_enum(
            raw.get("containerHost") if isinstance(raw, Mapping) else None,
            CONTAINER_HOSTS,
        )
        interaction_surface = _normalize_enum(
            raw.get("interactionSurface") if isinstance(raw, Mapping) else None,
            INTERACTION_SURFACES,
        )
        runtime_product = _normalize_enum(
            raw.get("runtimeProduct") if isinstance(raw, Mapping) else None,
            RUNTIME_PRODUCTS,
        )
        reason_value = raw.get("reason") if isinstance(raw, Mapping) else None
        reason = reason_value if isinstance(reason_value, str) and reason_value else None

    return {
        "key": key,
        "display_label": _display_label_for(key, active_registry),
        "container_host": container_host,
        "interaction_surface": interaction_surface,
        "runtime_product": runtime_product,
        "classified": classified,
        "registry_version": int(active_registry["registry_version"]),
        "reason": reason,
        "provenance": {
            "key": _normalize_provenance(provenance.get("key")),
            "container_host": _normalize_provenance(provenance.get("containerHost")),
            "interaction_surface": _normalize_provenance(provenance.get("interactionSurface")),
            "runtime_product": _normalize_provenance(provenance.get("runtimeProduct")),
            "display_label": "derived",
        },
    }


def build_session_classification_summary(classifications: list[Mapping[str, Any]]) -> dict[str, Any]:
    summary = empty_session_classification_summary()

    for classification in classifications:
        key_value = classification.get("key") if isinstance(classification, Mapping) else None
        key = key_value if isinstance(key_value, str) and key_value in SESSION_TYPE_KEYS else "unknown"
        summary["counts_by_type"][key] += 1

        provenance = classification.get("provenance") if isinstance(classification, Mapping) else None
        provenance_key = provenance.get("key") if isinstance(provenance, Mapping) else None
        normalized_provenance = _normalize_provenance(provenance_key)
        summary["counts_by_provenance"][normalized_provenance] += 1

        if key == "unknown":
            summary["unknown_count"] += 1
        else:
            summary["classified_count"] += 1

    return summary
