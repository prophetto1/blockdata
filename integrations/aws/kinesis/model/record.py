from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Record:
    o_b_j_e_c_t__m_a_p_p_e_r: ObjectMapper | None = None
    partition_key: str
    explicit_hash_key: str | None = None
    data: str

    def to_put_records_request_entry(self, run_context: RunContext) -> PutRecordsRequestEntry:
        raise NotImplementedError  # TODO: translate from Java
