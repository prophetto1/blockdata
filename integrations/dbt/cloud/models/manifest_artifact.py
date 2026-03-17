from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ManifestArtifact:
    metadata: dict[String, Object] | None = None
    nodes: dict[String, Map[String, Object]] | None = None
    sources: dict[String, Map[String, Object]] | None = None
    macros: dict[String, Map[String, Object]] | None = None
    docs: dict[String, Map[String, Object]] | None = None
    exposures: dict[String, Map[String, Object]] | None = None
    metrics: dict[String, Map[String, Object]] | None = None
    groups: dict[String, Map[String, Object]] | None = None
    selectors: dict[String, Object] | None = None
    disabled: dict[String, List[Map[String, Object]]] | None = None
    parent_map: dict[String, List[String]] | None = None
    child_map: dict[String, List[String]] | None = None
    group_map: dict[String, List[String]] | None = None
    saved_queries: dict[String, Object] | None = None
    semantic_models: dict[String, Map[String, Object]] | None = None
    unit_tests: dict[String, Map[String, Object]] | None = None
