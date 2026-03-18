from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-serdes\src\main\java\io\kestra\plugin\serdes\parquet\ParquetTools.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class ParquetTools(ABC):

    @staticmethod
    def handle_logger() -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def init_snappy() -> None:
        raise NotImplementedError  # TODO: translate from Java
