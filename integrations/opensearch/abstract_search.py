from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-opensearch\src\main\java\io\kestra\plugin\opensearch\AbstractSearch.java
# WARNING: Unresolved types: Builder, IOException, ObjectMapper, OpenSearchTransport, SearchRequest

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
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()
    content_type: Property[XContentType] = Property.ofValue(XContentType.JSON)
    indexes: Property[list[str]] | None = None
    request: Any | None = None

    def request(self, run_context: RunContext, transport: OpenSearchTransport) -> SearchRequest.Builder:
        raise NotImplementedError  # TODO: translate from Java

    def parse_query(self, transport: OpenSearchTransport, query: str) -> SearchRequest:
        raise NotImplementedError  # TODO: translate from Java
