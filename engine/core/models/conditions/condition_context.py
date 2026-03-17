from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\conditions\ConditionContext.java

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.executions.execution import Execution
from engine.core.models.flows.flow_interface import FlowInterface
from engine.core.models.triggers.multipleflows.multiple_condition_storage_interface import MultipleConditionStorageInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class ConditionContext:
    flow: FlowInterface
    run_context: RunContext
    variables: dict[str, Any] = field(default_factory=dict)
    execution: Execution | None = None
    multiple_condition_storage: MultipleConditionStorageInterface | None = None
