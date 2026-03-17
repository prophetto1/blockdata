from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\Label.java
# WARNING: Unresolved types: Entry

from dataclasses import dataclass, field
from typing import Any, Callable, ClassVar


@dataclass(slots=True, kw_only=True)
class Label:
    system_prefix: ClassVar[str] = "system."
    correlation_id: ClassVar[str] = SYSTEM_PREFIX + "correlationId"
    username: ClassVar[str] = SYSTEM_PREFIX + "username"
    app: ClassVar[str] = SYSTEM_PREFIX + "app"
    read_only: ClassVar[str] = SYSTEM_PREFIX + "readOnly"
    restarted: ClassVar[str] = SYSTEM_PREFIX + "restarted"
    replay: ClassVar[str] = SYSTEM_PREFIX + "replay"
    replayed: ClassVar[str] = SYSTEM_PREFIX + "replayed"
    simulated_execution: ClassVar[str] = SYSTEM_PREFIX + "simulatedExecution"
    test: ClassVar[str] = SYSTEM_PREFIX + "test"
    from: ClassVar[str] = SYSTEM_PREFIX + "from"
    kill_switch: ClassVar[str] = SYSTEM_PREFIX + "killSwitch"
    key: str | None = None
    value: str | None = None

    @staticmethod
    def to_nested_map(labels: list[Label]) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def to_map(labels: list[Label]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def deduplicate(labels: list[Label]) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def from(map: dict[str, str]) -> list[Label]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_entry_not_empty_predicate() -> Callable[Map.Entry[str, str]]:
        raise NotImplementedError  # TODO: translate from Java
