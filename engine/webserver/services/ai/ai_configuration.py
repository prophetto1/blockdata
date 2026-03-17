from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\AiConfiguration.java

from typing import Any, Protocol


class AiConfiguration(Protocol):
    def type(self) -> str: ...

    def model_name(self) -> str: ...

    def temperature(self) -> float: ...

    def top_p(self) -> float: ...
