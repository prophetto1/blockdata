from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcCleanerService.java

from typing import Any, Protocol


class JdbcCleanerService(Protocol):
    def build_type_condition(self, type: str) -> Condition: ...
