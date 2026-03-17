from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ThreadUncaughtExceptionHandler.java
# WARNING: Unresolved types: Thread, Throwable, UncaughtExceptionHandler

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class ThreadUncaughtExceptionHandler:
    instance: ClassVar[UncaughtExceptionHandler]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def uncaught_exception(self, t: Thread, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java
