from __future__ import annotations

from pathlib import PurePosixPath
from typing import Literal

from app.pipelines.registry import get_pipeline_definition, list_pipeline_definitions

StorageSurface = Literal["assets", "pipeline-services"]


def _safe_path_segment(value: str | None, *, field_name: str) -> str:
    safe = PurePosixPath(value or "").name
    if safe in {"", ".", ".."}:
        raise ValueError(f"{field_name} is required")
    return safe


def normalize_storage_namespace(
    *,
    storage_surface: str | None,
    storage_service_slug: str | None,
) -> tuple[StorageSurface, str | None]:
    surface = storage_surface or "assets"
    if surface not in {"assets", "pipeline-services"}:
        raise ValueError("storage_surface must be 'assets' or 'pipeline-services'")
    if surface == "assets":
        return "assets", None
    return "pipeline-services", _safe_path_segment(
        storage_service_slug,
        field_name="storage_service_slug",
    )


def is_assets_surface(storage_surface: str | None) -> bool:
    return (storage_surface or "assets") == "assets"


def is_pipeline_services_surface(storage_surface: str | None) -> bool:
    return (storage_surface or "assets") == "pipeline-services"


def get_pipeline_kind_for_service_slug(storage_service_slug: str | None) -> str | None:
    if not storage_service_slug:
        return None
    for summary in list_pipeline_definitions():
        pipeline_kind = str(summary["pipeline_kind"])
        definition = get_pipeline_definition(pipeline_kind)
        if definition and definition.get("storage_service_slug") == storage_service_slug:
            return pipeline_kind
    return None
