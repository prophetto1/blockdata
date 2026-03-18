from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ThreadUncaughtExceptionHandler.java
# WARNING: Unresolved types: Thread, UncaughtExceptionHandler

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ThreadUncaughtExceptionHandler:
    instance: ClassVar[UncaughtExceptionHandler]
    logger: ClassVar[Logger] = getLogger(__name__)

    def uncaught_exception(self, t: Thread, e: BaseException) -> None:
        raise NotImplementedError  # TODO: translate from Java
