from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\PluginVersioning.java

from typing import Any, Protocol


class PluginVersioning(Protocol):
    def get_version(self) -> str: ...
