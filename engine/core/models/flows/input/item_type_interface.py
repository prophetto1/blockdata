from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\input\ItemTypeInterface.java

from typing import Any, Protocol

from engine.core.models.flows.type import Type


class ItemTypeInterface(Protocol):
    def get_item_type(self) -> Type: ...
