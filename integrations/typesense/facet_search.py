from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.typesense.search import Search


@dataclass(slots=True, kw_only=True)
class FacetSearch(Search):
    """Search with facets in Typesense"""
    facet_by: Property[str]

    def build_search_param(self, run_context: RunContext) -> SearchParameters:
        raise NotImplementedError  # TODO: translate from Java
