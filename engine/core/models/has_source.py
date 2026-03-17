from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\HasSource.java
# WARNING: Unresolved types: BiConsumer, CompletedFileUpload, Function, IOException, T

from typing import Any, Protocol


class HasSource(Protocol):
    def source(self) -> str: ...

    def as_zip_file(sources: list[Any], zip_entry_name: Function[T, str]) -> list[int]: ...

    def read_source_file(file_upload: CompletedFileUpload, reader: BiConsumer[str, str]) -> None: ...

    def is_y_a_m_l(file_name: str) -> bool: ...
