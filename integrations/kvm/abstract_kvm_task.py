from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kvm\src\main\java\io\kestra\plugin\kvm\AbstractKvmTask.java
# WARNING: Unresolved types: Connect, Domain, Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.kvm.libvirt_connection import LibvirtConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractKvmTask(ABC, Task):
    uri: Property[str] | None = None

    def get_connection(self, run_context: RunContext) -> LibvirtConnection:
        raise NotImplementedError  # TODO: translate from Java

    def get_domain(self, conn: Connect, name: str) -> Domain:
        raise NotImplementedError  # TODO: translate from Java
