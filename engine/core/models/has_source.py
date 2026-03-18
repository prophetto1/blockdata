from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\HasSource.java

from typing import Any, Callable, Protocol


class HasSource(Protocol):
    def source(self) -> str: ...

    def as_zip_file(sources: list[Any], zip_entry_name: Callable[T, str]) -> list[int]: ...

    def read_source_file(file_upload: CompletedFileUpload, reader: Callable[str, str]) -> None: ...

    def is_yaml(file_name: str) -> bool: ...
