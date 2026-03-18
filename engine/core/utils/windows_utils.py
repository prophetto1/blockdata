from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\WindowsUtils.java

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class WindowsUtils:

    @staticmethod
    def windows_to_unix_path(path: str, start_with_slash: bool | None = None) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def windows_to_unix_uri(uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
