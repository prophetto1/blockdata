from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\check\Check.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class Check:
    condition: str
    style: Style = Style.INFO
    behavior: Behavior = Behavior.BLOCK_EXECUTION
    message: str | None = None

    @staticmethod
    def resolve_behavior(checks: list[Check]) -> Check.Behavior:
        raise NotImplementedError  # TODO: translate from Java

    class Style(str, Enum):
        ERROR = "ERROR"
        SUCCESS = "SUCCESS"
        WARNING = "WARNING"
        INFO = "INFO"

    class Behavior(str, Enum):
        BLOCK_EXECUTION = "BLOCK_EXECUTION"
        FAIL_EXECUTION = "FAIL_EXECUTION"
        CREATE_EXECUTION = "CREATE_EXECUTION"
