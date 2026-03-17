from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\reporter\ReportableRegistry.java
# WARNING: Unresolved types: ConcurrentHashMap

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar

from engine.core.reporter.reportable import Reportable
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class ReportableRegistry:
    reportables: dict[Type, Reportable[Any]]
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    def register(self, reportable: Reportable[Any]) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_all(self) -> list[Reportable[Any]]:
        raise NotImplementedError  # TODO: translate from Java
