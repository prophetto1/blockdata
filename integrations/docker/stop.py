from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-docker\src\main\java\io\kestra\plugin\docker\Stop.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.docker.abstract_docker import AbstractDocker
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Stop(AbstractDocker):
    """Stop or kill a Docker container"""
    kill: Property[bool] = Property.ofValue(false)
    delete: Property[bool] = Property.ofValue(true)
    container_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
