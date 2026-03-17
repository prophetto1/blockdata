from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\TaskInterface.java

from typing import Any, Protocol

from engine.core.models.plugin import Plugin
from engine.core.models.plugin_versioning import PluginVersioning


class TaskInterface(Protocol):
    def get_id(self) -> str: ...

    def get_type(self) -> str: ...
