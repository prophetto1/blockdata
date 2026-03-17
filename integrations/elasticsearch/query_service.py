from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\QueryService.java
# WARNING: Unresolved types: Builder, IOException, ObjectMapper, SearchRequest

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class QueryService(ABC):
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()

    @staticmethod
    def request(run_context: RunContext, request: Any) -> SearchRequest.Builder:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parse_query(query: str) -> SearchRequest.Builder:
        raise NotImplementedError  # TODO: translate from Java
