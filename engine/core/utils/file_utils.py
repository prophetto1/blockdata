from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\utils\FileUtils.java

from dataclasses import dataclass
from typing import Any, Optional


@dataclass(slots=True, kw_only=True)
class FileUtils:

    @staticmethod
    def get_extension(file: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_uri(path: str) -> Optional[str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_file_name(uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
