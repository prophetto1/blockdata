from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kvm\src\main\java\io\kestra\plugin\kvm\DeleteVm.java
# WARNING: Unresolved types: Connect, Domain, Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.kvm.abstract_kvm_task import AbstractKvmTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteVm(AbstractKvmTask):
    """Delete or undefine KVM domain"""
    name: Property[str]
    delete_storage: Property[bool] = Property.ofValue(false)
    fail_if_not_found: Property[bool] = Property.ofValue(true)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def find_and_delete_volumes(self, domain: Domain, conn: Connect, run_context: RunContext) -> list[str]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        success: bool | None = None
        deleted_volumes: list[str] | None = None
