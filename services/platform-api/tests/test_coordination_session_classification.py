from __future__ import annotations

import importlib
from typing import Any


def _module():
    return importlib.import_module("app.services.coordination.session_classification")


def _known_payload() -> dict[str, Any]:
    return {
        "identity": "cc",
        "details": {
            "sessionClassification": {
                "key": "vscode.cc.cli",
                "containerHost": "vscode",
                "interactionSurface": "cli",
                "runtimeProduct": "cc",
                "classified": True,
                "registryVersion": 1,
                "reason": None,
                "provenance": {
                    "key": "launch_stamped",
                    "containerHost": "launch_stamped",
                    "interactionSurface": "launch_stamped",
                    "runtimeProduct": "launch_stamped",
                },
            }
        },
    }


def _partial_known_unknown_payload() -> dict[str, Any]:
    return {
        "identity": "cc2",
        "details": {
            "sessionClassification": {
                "key": "unknown",
                "containerHost": "vscode",
                "interactionSurface": "unknown",
                "runtimeProduct": "unknown",
                "classified": False,
                "registryVersion": 1,
                "reason": "insufficient_signal",
                "provenance": {
                    "key": "unknown",
                    "containerHost": "launch_stamped",
                    "interactionSurface": "unknown",
                    "runtimeProduct": "unknown",
                },
            }
        },
    }


def test_load_session_classification_registry_returns_shared_v1_contract():
    registry = _module().load_session_classification_registry(force_reload=True)

    assert registry["registry_version"] == 1
    assert set(registry["session_types"].keys()) == {
        "vscode.cc.cli",
        "vscode.cdx.cli",
        "vscode.cc.ide-panel",
        "vscode.cdx.ide-panel",
        "claude-desktop.cc",
        "codex-app-win.cdx",
        "terminal.cc",
        "terminal.cdx",
        "unknown",
    }
    assert registry["session_types"]["vscode.cc.cli"]["display_label"] == "VS Code | CC CLI"
    assert registry["session_types"]["unknown"]["display_label"] == "Unknown"


def test_serialize_session_classification_derives_server_display_label():
    classification = _module().serialize_session_classification(_known_payload())

    assert classification == {
        "key": "vscode.cc.cli",
        "display_label": "VS Code | CC CLI",
        "container_host": "vscode",
        "interaction_surface": "cli",
        "runtime_product": "cc",
        "classified": True,
        "registry_version": 1,
        "reason": None,
        "provenance": {
            "key": "launch_stamped",
            "container_host": "launch_stamped",
            "interaction_surface": "launch_stamped",
            "runtime_product": "launch_stamped",
            "display_label": "derived",
        },
    }


def test_serialize_session_classification_preserves_partial_known_unknown_records():
    classification = _module().serialize_session_classification(_partial_known_unknown_payload())

    assert classification == {
        "key": "unknown",
        "display_label": "Unknown",
        "container_host": "vscode",
        "interaction_surface": "unknown",
        "runtime_product": "unknown",
        "classified": False,
        "registry_version": 1,
        "reason": "insufficient_signal",
        "provenance": {
            "key": "unknown",
            "container_host": "launch_stamped",
            "interaction_surface": "unknown",
            "runtime_product": "unknown",
            "display_label": "derived",
        },
    }


def test_serialize_session_classification_maps_legacy_records_to_unknown():
    classification = _module().serialize_session_classification({"identity": "legacy-cdx"})

    assert classification["key"] == "unknown"
    assert classification["display_label"] == "Unknown"
    assert classification["classified"] is False
    assert classification["container_host"] == "unknown"
    assert classification["interaction_surface"] == "unknown"
    assert classification["runtime_product"] == "unknown"
    assert classification["registry_version"] == 1
    assert classification["provenance"]["key"] == "unknown"
    assert classification["provenance"]["display_label"] == "derived"


def test_build_session_classification_summary_uses_provenance_key_only():
    summary = _module().build_session_classification_summary(
        [
            _module().serialize_session_classification(_known_payload()),
            _module().serialize_session_classification(_partial_known_unknown_payload()),
            {
                "key": "terminal.cc",
                "display_label": "Terminal | CC",
                "container_host": "terminal",
                "interaction_surface": "cli",
                "runtime_product": "cc",
                "classified": True,
                "registry_version": 1,
                "reason": None,
                "provenance": {
                    "key": "inferred",
                    "container_host": "launch_stamped",
                    "interaction_surface": "runtime_observed",
                    "runtime_product": "configured",
                    "display_label": "derived",
                },
            },
        ]
    )

    assert summary["classified_count"] == 2
    assert summary["unknown_count"] == 1
    assert summary["counts_by_type"]["vscode.cc.cli"] == 1
    assert summary["counts_by_type"]["terminal.cc"] == 1
    assert summary["counts_by_type"]["unknown"] == 1
    assert summary["counts_by_provenance"] == {
        "launch_stamped": 1,
        "runtime_observed": 0,
        "configured": 0,
        "inferred": 1,
        "unknown": 1,
    }
