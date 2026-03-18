from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\services\LoggingOutputStream.java
# WARNING: Unresolved types: ByteArrayOutputStream, IOException, OutputStream, io, java

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer


@dataclass(slots=True, kw_only=True)
class LoggingOutputStream(OutputStream):
    written_logs: set[int] = Collections.synchronizedSet(new HashSet<>())
    baos: ByteArrayOutputStream = new ByteArrayOutputStream()
    last_emission_nanos: int = 0
    m_i_n__d_e_l_a_y__b_e_t_w_e_e_n__e_m_i_s_s_i_o_n_s__n_a_n_o_s: ClassVar[int] = 2_000_000
    log_consumer: AbstractLogConsumer | None = None
    last_timestamp: datetime | None = None

    def get_last_timestamp(self) -> datetime:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, b: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def write(self, b: list[int], off: int, len: int) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def send(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def flush(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def close(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
