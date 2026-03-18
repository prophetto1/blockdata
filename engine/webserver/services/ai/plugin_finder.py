from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\PluginFinder.java

from typing import Any, Protocol


class PluginFinder(Protocol):
    def find_plugins(self, plugin_types: str, user_prompt: str) -> list[str]: ...
