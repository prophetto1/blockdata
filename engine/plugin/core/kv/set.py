from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\kv\Set.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from engine.core.models.kv.k_v_type import KVType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.task import Task
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Set(Task):
    """Create or update a key-value entry."""
    key: Property[str]
    value: Property[str]
    namespace: Property[str] = Property.ofExpression("{{ flow.namespace }}")
    overwrite: Property[bool] = Property.ofValue(true)
    kv_description: Property[str] | None = None
    ttl: Property[timedelta] | None = None
    kv_type: Property[KVType] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
