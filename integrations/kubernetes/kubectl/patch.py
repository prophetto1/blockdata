from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\kubectl\Patch.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kubernetes.abstract_pod import AbstractPod
from integrations.kubernetes.models.metadata import Metadata
from integrations.kubernetes.models.patch_strategy import PatchStrategy
from engine.core.models.property.property import Property
from integrations.kubernetes.models.resource_status import ResourceStatus
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Patch(AbstractPod):
    """Patch Kubernetes resources with merge or JSON patch"""
    resource_type: Property[str]
    resource_name: Property[str]
    patch: Property[str]
    patch_strategy: Property[PatchStrategy] = Property.ofValue(PatchStrategy.STRATEGIC_MERGE)
    api_group: Property[str] | None = None
    api_version: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        metadata: Metadata | None = None
        status: ResourceStatus | None = None
