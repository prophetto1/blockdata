from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\storage\blob\abstracts\ActionInterface.java
# WARNING: Unresolved types: CopyObject

from enum import Enum
from typing import Any, Protocol

from integrations.aws.s3.copy import Copy
from engine.core.models.property.property import Property


class ActionInterface(Protocol):
    def get_action(self) -> Property[Action]: ...

    def get_move_to(self) -> Copy.CopyObject: ...
