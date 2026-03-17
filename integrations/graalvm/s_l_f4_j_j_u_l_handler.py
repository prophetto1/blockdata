from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\SLF4JJULHandler.java
# WARNING: Unresolved types: Logger, SLF4JBridgeHandler

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.logs.log_record import LogRecord


@dataclass(slots=True, kw_only=True)
class SLF4JJULHandler(SLF4JBridgeHandler):
    logger: Logger | None = None

    def get_s_l_f4_j_logger(self, record: LogRecord) -> Logger:
        raise NotImplementedError  # TODO: translate from Java
