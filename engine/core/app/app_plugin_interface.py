from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\app\AppPluginInterface.java
# WARNING: Unresolved types: core, io, kestra, models

from typing import Any, Protocol

from engine.core.models.annotations.plugin import Plugin


class AppPluginInterface(Protocol):
    def get_type(self) -> str: ...
