from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\commands\flows\IncludeHelperExpander.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True, kw_only=True)
class IncludeHelperExpander(ABC):

    @staticmethod
    def expand(value: str, directory: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def expand_line(line: str, directory: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java
