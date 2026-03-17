from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\runners\RemoteRunnerInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class RemoteRunnerInterface(Protocol):
    def get_sync_working_directory(self) -> Property[bool]: ...
