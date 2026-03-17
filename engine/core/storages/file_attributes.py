from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\storages\FileAttributes.java
# WARNING: Unresolved types: IOException

from typing import Any, Protocol


class FileAttributes(Protocol):
    def get_file_name(self) -> str: ...

    def get_last_modified_time(self) -> int: ...

    def get_creation_time(self) -> int: ...

    def get_type(self) -> FileType: ...

    def get_size(self) -> int: ...

    def get_metadata(self) -> dict[str, str]: ...
