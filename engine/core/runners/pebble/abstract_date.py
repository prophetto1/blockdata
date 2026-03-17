from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\AbstractDate.java
# WARNING: Unresolved types: DateTimeFormatter, FormatStyle, ZoneId

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class AbstractDate(ABC):
    formatters: ClassVar[dict[str, DateTimeFormatter]]
    styles: ClassVar[dict[str, FormatStyle]]

    def get_argument_names(self) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def format(input: Any, args: dict[str, Any], context: EvaluationContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def formatter(format: str) -> DateTimeFormatter:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def zone_id(input: str) -> ZoneId:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def convert(value: Any, zone_id: ZoneId, existing_format: str) -> datetime:
        raise NotImplementedError  # TODO: translate from Java
