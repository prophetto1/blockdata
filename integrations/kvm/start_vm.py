from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.kvm.abstract_kvm_task import AbstractKvmTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class StartVm(AbstractKvmTask, RunnableTask):
    """Start a KVM domain"""
    name: Property[str]
    wait_for_running: Property[bool] | None = None
    time_to_wait: Property[timedelta] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        name: str | None = None
        state: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    name: str | None = None
    state: str | None = None
