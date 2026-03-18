from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\AzureSasTokenInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class AzureSasTokenInterface(Protocol):
    def get_sas_token(self) -> Property[str]: ...
