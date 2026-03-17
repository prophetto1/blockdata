from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\EnvironmentProvider.java

from typing import Any, Protocol


class EnvironmentProvider(Protocol):
    def get_cli_environments(self) -> list[str]: ...
