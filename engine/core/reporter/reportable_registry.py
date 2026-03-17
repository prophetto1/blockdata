from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\ReportableRegistry.java
# WARNING: Unresolved types: ConcurrentHashMap

from dataclasses import dataclass
from typing import Any

from engine.core.reporter.reportable import Reportable
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ReportableRegistry:
    reportables: dict[Type, Reportable[Any]] = new ConcurrentHashMap<>()

    def register(self, reportable: Reportable[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_all(self) -> list[Reportable[Any]]:
        raise NotImplementedError  # TODO: translate from Java
