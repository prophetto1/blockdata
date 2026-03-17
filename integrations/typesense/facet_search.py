from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-typesense\src\main\java\io\kestra\plugin\typesense\FacetSearch.java
# WARNING: Unresolved types: SearchParameters

from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.algolia.search import Search


@dataclass(slots=True, kw_only=True)
class FacetSearch(Search):
    """Search with facets in Typesense"""
    facet_by: Property[str]

    def build_search_param(self, run_context: RunContext) -> SearchParameters:
        raise NotImplementedError  # TODO: translate from Java
