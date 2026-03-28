from __future__ import annotations

import importlib
from functools import lru_cache
from typing import Any


_PIPELINE_DEFINITIONS: dict[str, dict[str, Any]] = {
    "markdown_index_builder": {
        "pipeline_kind": "markdown_index_builder",
        "label": "Index Builder",
        "supports_manual_trigger": True,
        "eligible_source_types": ["md", "markdown"],
        "deliverable_kinds": ["lexical_sqlite", "semantic_zip"],
        "storage_service_slug": "index-builder",
        "handler_module": "app.pipelines.markdown_index_builder",
        "handler_name": "run_markdown_index_builder",
    }
}


@lru_cache(maxsize=None)
def _handler_exists(module_name: str, handler_name: str) -> bool:
    try:
        module = importlib.import_module(module_name)
    except Exception:
        return False
    return getattr(module, handler_name, None) is not None


def list_pipeline_definitions() -> list[dict[str, Any]]:
    return [
        {
            "pipeline_kind": item["pipeline_kind"],
            "label": item["label"],
            "supports_manual_trigger": item["supports_manual_trigger"],
            "eligible_source_types": list(item["eligible_source_types"]),
            "deliverable_kinds": list(item["deliverable_kinds"]),
        }
        for item in _PIPELINE_DEFINITIONS.values()
    ]


def get_pipeline_definition(pipeline_kind: str) -> dict[str, Any] | None:
    item = _PIPELINE_DEFINITIONS.get(pipeline_kind)
    if item is None:
        return None
    return {
        "pipeline_kind": item["pipeline_kind"],
        "label": item["label"],
        "supports_manual_trigger": item["supports_manual_trigger"],
        "eligible_source_types": list(item["eligible_source_types"]),
        "deliverable_kinds": list(item["deliverable_kinds"]),
        "storage_service_slug": item["storage_service_slug"],
    }


def list_pipeline_worker_definitions() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for item in _PIPELINE_DEFINITIONS.values():
        worker = get_pipeline_worker_definition(item["pipeline_kind"])
        if worker is not None:
            items.append(worker)
    return items


def get_pipeline_worker_definition(pipeline_kind: str) -> dict[str, Any] | None:
    item = _PIPELINE_DEFINITIONS.get(pipeline_kind)
    if item is None:
        return None
    if not _handler_exists(item["handler_module"], item["handler_name"]):
        return None
    return {
        "pipeline_kind": item["pipeline_kind"],
        "handler_module": item["handler_module"],
        "handler_name": item["handler_name"],
    }
