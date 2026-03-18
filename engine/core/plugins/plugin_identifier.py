from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\plugins\PluginIdentifier.java
# WARNING: Unresolved types: Pair

from typing import Any, Protocol


class PluginIdentifier(Protocol):
    def parse_identifier(identifier: str) -> Pair[str, str]: ...
