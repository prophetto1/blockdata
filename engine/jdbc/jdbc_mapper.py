from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\JdbcMapper.java
# WARNING: Unresolved types: DateTimeFormatter

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class JdbcMapper(ABC):
    instant_formatter: ClassVar[DateTimeFormatter]
    zoned_date_time_formatter: ClassVar[DateTimeFormatter]
    mapper: ClassVar[ObjectMapper]

    @staticmethod
    def of() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def init() -> ObjectMapper:
        raise NotImplementedError  # TODO: translate from Java
