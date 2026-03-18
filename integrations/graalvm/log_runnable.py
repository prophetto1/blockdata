from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\LogRunnable.java
# WARNING: Unresolved types: InputStream, Logger, Runnable

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class LogRunnable:
    input_stream: InputStream | None = None
    is_std_err: bool | None = None
    logger: Logger | None = None

    def run(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
