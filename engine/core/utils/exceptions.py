from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\Exceptions.java
# WARNING: Unresolved types: Throwable

from typing import Any, Protocol


class Exceptions(Protocol):
    def get_stacktrace_as_string(throwable: Throwable) -> str: ...

    def get_stacktrace_as_string(throwable: Throwable, max_lines: int) -> str: ...

    def throw_if_fatal(t: Throwable) -> None: ...
