from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\ExecutionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class ExecutionInterface(Protocol):
    def get_execution_id(self) -> Property[str]: ...

    def get_custom_fields(self) -> Property[dict[str, Any]]: ...

    def get_custom_message(self) -> Property[str]: ...
