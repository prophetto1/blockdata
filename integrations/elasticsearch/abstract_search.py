from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\AbstractSearch.java
# WARNING: Unresolved types: Builder, IOException, SearchRequest

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.elasticsearch.model.x_content_type import XContentType


@dataclass(slots=True, kw_only=True)
class AbstractSearch(ABC, AbstractTask):
    request: Any
    content_type: XContentType = XContentType.JSON
    indexes: Property[list[str]] | None = None

    def request(self, run_context: RunContext) -> SearchRequest.Builder:
        raise NotImplementedError  # TODO: translate from Java
