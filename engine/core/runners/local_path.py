from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\LocalPath.java
# WARNING: Unresolved types: BasicFileAttributes

from typing import Any, Protocol


class LocalPath(Protocol):
    def get(self, uri: str) -> Any: ...

    def exists(self, uri: str) -> bool: ...

    def get_attributes(self, uri: str) -> BasicFileAttributes: ...
