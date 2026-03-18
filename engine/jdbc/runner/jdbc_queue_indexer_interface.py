from __future__ import annotations

# Source: E:\KESTRA\jdbc\src\main\java\io\kestra\jdbc\runner\JdbcQueueIndexerInterface.java

from typing import Any, Protocol


class JdbcQueueIndexerInterface(Protocol):
    def save(self, context: DSLContext, message: T) -> T: ...
