from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-slack\src\main\java\io\kestra\plugin\slack\app\chats\ChatInterface.java

from datetime import datetime
from typing import Any, Protocol

from engine.core.models.property.property import Property


class ChatInterface(Protocol):
    def get_channel(self) -> Property[str]: ...

    def get_timestamp(self) -> Property[datetime]: ...

    def get_username(self) -> Property[str]: ...

    def get_icon_url(self) -> Property[str]: ...

    def get_icon_emoji(self) -> Property[str]: ...
