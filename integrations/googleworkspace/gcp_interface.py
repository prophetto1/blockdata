from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\GcpInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class GcpInterface(Protocol):
    def get_service_account(self) -> Property[str]: ...

    def get_scopes(self) -> Property[list[str]]: ...

    def get_read_timeout(self) -> Property[int]: ...
