from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\runners\pebble\OutputWriter.java
# WARNING: Unresolved types: Writer

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class OutputWriter(Writer):

    def output(self) -> Any:
        raise NotImplementedError  # TODO: translate from Java
