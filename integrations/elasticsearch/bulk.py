from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_load import AbstractLoad
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Bulk(AbstractLoad, RunnableTask):
    """Replay Elasticsearch bulk file"""
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        raise NotImplementedError  # TODO: translate from Java

    def file_reader(self, input: BufferedReader) -> Consumer[FluxSink[BulkOperation]]:
        raise NotImplementedError  # TODO: translate from Java

    def parseline(self, is_json: bool, line: str) -> dict[Any, Any]:
        raise NotImplementedError  # TODO: translate from Java
