from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\listeners\DeleteConfigurationApplicationListeners.java
# WARNING: Unresolved types: Environment, IOException, StartupEvent

from dataclasses import dataclass, field
from logging import logging
from typing import Any, ClassVar


@dataclass(slots=True, kw_only=True)
class DeleteConfigurationApplicationListeners:
    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)
    environment: Environment | None = None

    def on_startup_event(self, event: StartupEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java
