from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-openai\src\main\java\io\kestra\plugin\openai\OpenAiInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class OpenAiInterface(Protocol):
    def get_api_key(self) -> Property[str]: ...

    def get_user(self) -> Property[str]: ...

    def get_client_timeout(self) -> int: ...
