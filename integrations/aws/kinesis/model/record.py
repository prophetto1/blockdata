from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\kinesis\model\Record.java
# WARNING: Unresolved types: ObjectMapper, PutRecordsRequestEntry

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Record:
    partition_key: str
    data: str
    o_b_j_e_c_t__m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofJson()
    explicit_hash_key: str | None = None

    def to_put_records_request_entry(self, run_context: RunContext) -> PutRecordsRequestEntry:
        raise NotImplementedError  # TODO: translate from Java
