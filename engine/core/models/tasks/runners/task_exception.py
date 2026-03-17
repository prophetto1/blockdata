from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\TaskException.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.runners.abstract_log_consumer import AbstractLogConsumer


@dataclass(slots=True, kw_only=True)
class TaskException(Exception):
    serial_version_u_i_d: int = 1
    exit_code: int | None = None
    std_out_count: int | None = None
    std_err_count: int | None = None
    log_consumer: AbstractLogConsumer | None = None
