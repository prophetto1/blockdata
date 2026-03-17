from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Debug.java
# WARNING: Unresolved types: JavaTimeModule, Logger, ObjectMapper, T

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Debug:
    n_a_m_e: str = Thread.currentThread().getStackTrace()[2].getClassName()
    l_o_g_g_e_r: Logger = LoggerFactory.getLogger(NAME)
    m_a_p_p_e_r: ObjectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

    @staticmethod
    def caller() -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_json(arg: T) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def log() -> None:
        raise NotImplementedError  # TODO: translate from Java
