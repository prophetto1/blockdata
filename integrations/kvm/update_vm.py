from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kvm\src\main\java\io\kestra\plugin\kvm\UpdateVm.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kvm.abstract_kvm_task import AbstractKvmTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UpdateVm(AbstractKvmTask):
    """Update KVM domain definition"""
    restart: Property[bool] = Property.ofValue(false)
    name: Property[str] | None = None
    xml_definition: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        name: str | None = None
        was_restarted: bool | None = None
        state: str | None = None
