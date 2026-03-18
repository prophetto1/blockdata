from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\Put.java
# WARNING: Unresolved types: Builder, Exception, IndexRequest, JsonProcessingException, ObjectMapper, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.elasticsearch.model.op_type import OpType
from engine.core.models.property.property import Property
from integrations.elasticsearch.model.refresh_policy import RefreshPolicy
from engine.core.models.collectors.result import Result
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.elasticsearch.model.x_content_type import XContentType


@dataclass(slots=True, kw_only=True)
class Put(AbstractTask):
    """Index a document"""
    index: Property[str]
    m_a_p_p_e_r: ObjectMapper = JacksonMapper.ofJson()
    refresh_policy: Property[RefreshPolicy] = Property.ofValue(RefreshPolicy.NONE)
    content_type: Property[XContentType] = Property.ofValue(XContentType.JSON)
    op_type: Property[OpType] | None = None
    key: Property[str] | None = None
    value: Any | None = None

    def run(self, run_context: RunContext) -> Put.Output:
        raise NotImplementedError  # TODO: translate from Java

    def source(self, run_context: RunContext, request: IndexRequest.Builder[dict]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        id: str | None = None
        result: Result | None = None
        version: int | None = None
