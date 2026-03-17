from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\services\StorageService.java
# WARNING: Unresolved types: BufferedReader

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext
from engine.core.storages.storage_split_interface import StorageSplitInterface


@dataclass(slots=True, kw_only=True)
class StorageService(ABC):

    @staticmethod
    def split(run_context: RunContext, extension: str, separator: str, buffered_reader: BufferedReader | None = None, predicate: Callable[int, int, bool] | None = None) -> list[Path]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def partition(run_context: RunContext, extension: str, separator: str, buffered_reader: BufferedReader, partition: int) -> list[Path]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def split_by_regex(run_context: RunContext, extension: str, separator: str, buffered_reader: BufferedReader, regex_pattern: str) -> list[Path]:
        raise NotImplementedError  # TODO: translate from Java
