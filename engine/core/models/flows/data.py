from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\flows\Data.java

from typing import Any, Protocol

from engine.core.models.flows.type import Type


class Data(Protocol):
    def get_id(self) -> str: ...

    def get_type(self) -> Type: ...

    def get_display_name(self) -> str: ...
