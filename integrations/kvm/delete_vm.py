from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kvm.abstract_kvm_task import AbstractKvmTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class DeleteVm(AbstractKvmTask, RunnableTask):
    """Delete or undefine KVM domain"""
    name: Property[str]
    delete_storage: Property[bool] | None = None
    fail_if_not_found: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def find_and_delete_volumes(self, domain: Domain, conn: Connect, run_context: RunContext) -> list[String]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        success: bool | None = None
        deleted_volumes: list[String] | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    success: bool | None = None
    deleted_volumes: list[String] | None = None
