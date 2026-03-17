from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-datagen\src\main\java\io\kestra\plugin\datagen\model\Callback.java

from typing import Any, Protocol


class Callback(Protocol):
    def run(self) -> None: ...
