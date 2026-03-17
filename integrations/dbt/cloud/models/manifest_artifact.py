from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\models\ManifestArtifact.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ManifestArtifact:
    metadata: dict[str, Any] | None = None
    nodes: dict[str, dict[str, Any]] | None = None
    sources: dict[str, dict[str, Any]] | None = None
    macros: dict[str, dict[str, Any]] | None = None
    docs: dict[str, dict[str, Any]] | None = None
    exposures: dict[str, dict[str, Any]] | None = None
    metrics: dict[str, dict[str, Any]] | None = None
    groups: dict[str, dict[str, Any]] | None = None
    selectors: dict[str, Any] | None = None
    disabled: dict[str, list[dict[str, Any]]] | None = None
    parent_map: dict[str, list[str]] | None = None
    child_map: dict[str, list[str]] | None = None
    group_map: dict[str, list[str]] | None = None
    saved_queries: dict[str, Any] | None = None
    semantic_models: dict[str, dict[str, Any]] | None = None
    unit_tests: dict[str, dict[str, Any]] | None = None
