from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\metrics\MeterRegistryBinderFactory.java
# WARNING: Unresolved types: JvmThreadDeadlockMetrics, VirtualThreadMetrics

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MeterRegistryBinderFactory:

    def virtual_thread_metrics(self) -> VirtualThreadMetrics:
        raise NotImplementedError  # TODO: translate from Java

    def thread_deadlock_metrics_metrics(self) -> JvmThreadDeadlockMetrics:
        raise NotImplementedError  # TODO: translate from Java
