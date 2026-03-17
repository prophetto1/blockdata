from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\ThreadUncaughtExceptionHandler.java
# WARNING: Unresolved types: Thread, Throwable, UncaughtExceptionHandler

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ThreadUncaughtExceptionHandler:
    i_n_s_t_a_n_c_e: UncaughtExceptionHandler = new ThreadUncaughtExceptionHandler()

    def uncaught_exception(self, t: Thread, e: Throwable) -> None:
        raise NotImplementedError  # TODO: translate from Java
