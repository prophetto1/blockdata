from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\gcs\ActionInterface.java

from enum import Enum
from typing import Any, Protocol

from engine.core.models.property.property import Property


class ActionInterface(Protocol):
    def get_action(self) -> Property[Action]: ...

    def get_move_directory(self) -> Property[str]: ...
