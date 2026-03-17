from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-elasticsearch\src\main\java\io\kestra\plugin\elasticsearch\Bulk.java
# WARNING: Unresolved types: BufferedReader, BulkOperation, Consumer, Flux, FluxSink, IOException, JsonProcessingException, ObjectMapper

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.elasticsearch.abstract_load import AbstractLoad
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Bulk(AbstractLoad):
    """Replay Elasticsearch bulk file"""
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        raise NotImplementedError  # TODO: translate from Java

    def file_reader(self, input: BufferedReader) -> Consumer[FluxSink[BulkOperation]]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def parseline(is_json: bool, line: str) -> dict[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java
