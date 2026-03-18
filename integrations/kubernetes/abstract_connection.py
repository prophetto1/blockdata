from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\AbstractConnection.java
# WARNING: Unresolved types: ListOptions

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.kubernetes.models.connection import Connection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractConnection(ABC, Task):
    wait_until_running: Property[timedelta] = Property.ofValue(Duration.ofMinutes(10))
    wait_running: Property[timedelta] = Property.ofValue(Duration.ofHours(1))
    connection: Connection | None = None

    def list_options(self, run_context: RunContext) -> ListOptions:
        raise NotImplementedError  # TODO: translate from Java
