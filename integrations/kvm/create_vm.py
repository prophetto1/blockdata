from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kvm\src\main\java\io\kestra\plugin\kvm\CreateVm.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kvm.abstract_kvm_task import AbstractKvmTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateVm(AbstractKvmTask):
    """Create or update KVM domain"""
    name: Property[str]
    xml_definition: Property[str]
    start_after_create: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        name: str | None = None
        uuid: str | None = None
        state: str | None = None
