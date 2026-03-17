from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer


@dataclass(slots=True, kw_only=True)
class LoggingOutputStream(java):
    log_consumer: AbstractLogConsumer | None = None
    last_timestamp: datetime | None = None
    written_logs: set[Integer] | None = None
    baos: ByteArrayOutputStream | None = None
    last_emission_nanos: int | None = None
    m_i_n__d_e_l_a_y__b_e_t_w_e_e_n__e_m_i_s_s_i_o_n_s__n_a_n_o_s: int | None = None

    def get_last_timestamp(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, b: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, b: byte, off: int, len: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flush(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
