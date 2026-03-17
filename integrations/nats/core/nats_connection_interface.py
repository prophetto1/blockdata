from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\NatsConnectionInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class NatsConnectionInterface(Protocol):
    def get_url(self) -> str: ...

    def get_username(self) -> Property[str]: ...

    def get_password(self) -> Property[str]: ...

    def get_token(self) -> Property[str]: ...

    def get_creds(self) -> Property[str]: ...
