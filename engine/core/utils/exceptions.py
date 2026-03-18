from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Exceptions.java

from typing import Any, Protocol


class Exceptions(Protocol):
    def get_stacktrace_as_string(throwable: BaseException, max_lines: int | None = None) -> str: ...

    def throw_if_fatal(t: BaseException) -> None: ...
