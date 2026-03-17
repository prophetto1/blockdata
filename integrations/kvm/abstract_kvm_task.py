from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kvm.libvirt_connection import LibvirtConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractKvmTask(Task):
    uri: Property[str] | None = None

    def get_connection(self, run_context: RunContext) -> LibvirtConnection:
        raise NotImplementedError  # TODO: translate from Java

    def get_domain(self, conn: Connect, name: str) -> Domain:
        raise NotImplementedError  # TODO: translate from Java
