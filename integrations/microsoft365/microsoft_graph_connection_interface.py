from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\MicrosoftGraphConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class MicrosoftGraphConnectionInterface(Protocol):
    def get_client_id(self) -> Property[str]: ...

    def get_client_secret(self) -> Property[str]: ...

    def get_pem_certificate(self) -> Property[str]: ...

    def get_tenant_id(self) -> Property[str]: ...
