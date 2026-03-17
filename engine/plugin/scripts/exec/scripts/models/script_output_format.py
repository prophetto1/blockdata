from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\exec\scripts\models\ScriptOutputFormat.java
# WARNING: Unresolved types: T

from dataclasses import dataclass
from typing import Any

from engine.core.models.executions.abstract_metric_entry import AbstractMetricEntry


@dataclass(slots=True, kw_only=True)
class ScriptOutputFormat:
    outputs: dict[str, Any] | None = None
    metrics: list[AbstractMetricEntry[T]] | None = None
