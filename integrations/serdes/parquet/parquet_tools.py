from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class ParquetTools:

    def handle_logger(self) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def init_snappy(self) -> None:
        raise NotImplementedError  # TODO: translate from Java
