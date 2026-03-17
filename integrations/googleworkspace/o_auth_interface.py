from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-googleworkspace\src\main\java\io\kestra\plugin\googleworkspace\OAuthInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class OAuthInterface(Protocol):
    def get_client_id(self) -> Property[str]: ...

    def get_client_secret(self) -> Property[str]: ...

    def get_refresh_token(self) -> Property[str]: ...

    def get_access_token(self) -> Property[str]: ...

    def get_scopes(self) -> Property[list[str]]: ...

    def get_read_timeout(self) -> Property[int]: ...
