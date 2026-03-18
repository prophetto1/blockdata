from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\listeners\DeleteConfigurationApplicationListeners.java
# WARNING: Unresolved types: Environment, StartupEvent

from dataclasses import dataclass, field
from logging import Logger, getLogger
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class DeleteConfigurationApplicationListeners:
    logger: ClassVar[Logger] = getLogger(__name__)
    environment: Environment | None = None

    def on_startup_event(self, event: StartupEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java
