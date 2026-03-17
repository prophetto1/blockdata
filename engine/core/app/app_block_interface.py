from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\app\AppBlockInterface.java
# WARNING: Unresolved types: core, io, kestra, models

from typing import Any, Protocol

from engine.core.models.annotations.plugin import Plugin


class AppBlockInterface(Plugin, Protocol):
    def get_type(self) -> str: ...
