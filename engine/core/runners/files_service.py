from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\FilesService.java
# WARNING: Unresolved types: Exception

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class FilesService(ABC):

    @staticmethod
    def input_files(run_context: RunContext, inputs: Any) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def input_files(run_context: RunContext, additional_vars: dict[str, Any], inputs: Any) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def output_files(run_context: RunContext, outputs: list[str]) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def resolve_unique_name_for_file(path: Path) -> str:
        raise NotImplementedError  # TODO: translate from Java
