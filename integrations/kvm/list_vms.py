from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kvm.abstract_kvm_task import AbstractKvmTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class ListVms(AbstractKvmTask, RunnableTask):
    """List VMs"""
    status_filter: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        vms: java | None = None

    @dataclass(slots=True)
    class VmEntry:
        name: str | None = None
        uuid: str | None = None
        state: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    vms: java | None = None


@dataclass(slots=True, kw_only=True)
class VmEntry:
    name: str | None = None
    uuid: str | None = None
    state: str | None = None
