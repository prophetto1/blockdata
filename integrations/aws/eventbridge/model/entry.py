from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\eventbridge\model\Entry.java
# WARNING: Unresolved types: JsonProcessingException, ObjectMapper, PutEventsRequestEntry

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Entry:
    event_bus_name: str
    source: str
    detail_type: str
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    detail: Any | None = None
    resources: list[str] | None = None

    def to_request_entry(self, run_context: RunContext) -> PutEventsRequestEntry:
        raise NotImplementedError  # TODO: translate from Java

    def json_value(self, run_context: RunContext, event: Any) -> str:
        raise NotImplementedError  # TODO: translate from Java
