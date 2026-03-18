from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\GcpInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class GcpInterface(Protocol):
    def get_project_id(self) -> Property[str]: ...

    def get_service_account(self) -> Property[str]: ...

    def get_impersonated_service_account(self) -> Property[str]: ...

    def get_scopes(self) -> Property[list[str]]: ...
