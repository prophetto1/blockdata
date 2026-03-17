from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\RunnableTaskException.java
# WARNING: Unresolved types: Exception, Throwable

from dataclasses import dataclass
from typing import Any

from engine.core.models.flows.output import Output


@dataclass(slots=True, kw_only=True)
class RunnableTaskException(Exception):
    output: Output | None = None
