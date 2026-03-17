from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\triggers\StatefulTriggerInterface.java

from datetime import timedelta
from typing import Any, Protocol

from engine.core.models.property.property import Property


class StatefulTriggerInterface(Protocol):
    def get_on(self) -> Property[On]: ...

    def get_state_key(self) -> Property[str]: ...

    def get_state_ttl(self) -> Property[timedelta]: ...
