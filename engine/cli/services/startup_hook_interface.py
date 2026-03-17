from __future__ import annotations

# Source: E:\KESTRA\cli\src\main\java\io\kestra\cli\services\StartupHookInterface.java

from typing import Any, Protocol

from engine.cli.abstract_command import AbstractCommand


class StartupHookInterface(Protocol):
    def start(self, abstract_command: AbstractCommand) -> None: ...
