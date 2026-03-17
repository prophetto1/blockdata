from __future__ import annotations

# Source: E:\KESTRA\model\src\main\java\io\kestra\core\models\Plugin.java
# WARNING: Unresolved types: Class

from typing import Any, Optional, Protocol


class Plugin(Protocol):
    def get_type(self) -> str: ...

    def get_aliases(plugin: Class[Any]) -> set[str]: ...

    def is_internal(plugin: Class[Any]) -> bool: ...

    def is_deprecated(plugin: Class[Any]) -> bool: ...

    def is_primary(plugin: Class[Any]) -> bool: ...

    def get_id(plugin: Class[Any]) -> Optional[str]: ...
