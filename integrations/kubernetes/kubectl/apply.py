from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\kubectl\Apply.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kubernetes.abstract_pod import AbstractPod
from integrations.kubernetes.models.metadata import Metadata
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Apply(AbstractPod):
    """Apply Kubernetes resources with server-side apply"""
    spec: Property[str]

    def run(self, run_context: RunContext) -> Apply.Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        metadata: list[Metadata] | None = None
