from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\listeners\DeleteConfigurationApplicationListeners.java
# WARNING: Unresolved types: Environment, IOException, StartupEvent

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class DeleteConfigurationApplicationListeners:
    environment: Environment | None = None

    def on_startup_event(self, event: StartupEvent) -> None:
        raise NotImplementedError  # TODO: translate from Java
