from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\plugin\core\flow\ChildFlowInterface.java

from typing import Any, Protocol


class ChildFlowInterface(Protocol):
    def get_namespace(self) -> str: ...

    def get_flow_id(self) -> str: ...
