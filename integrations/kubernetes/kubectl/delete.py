from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\kubectl\Delete.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.kubernetes.abstract_pod import AbstractPod
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Delete(AbstractPod):
    """Delete Kubernetes resources by kind and name"""
    resource_type: Property[str]
    resources_names: Property[list[str]]
    api_group: Property[str] | None = None
    api_version: Property[str] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java
