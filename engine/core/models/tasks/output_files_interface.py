from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\OutputFilesInterface.java

from typing import Any, Protocol

from engine.core.models.property.property import Property


class OutputFilesInterface(Protocol):
    def get_output_files(self) -> Property[list[str]]: ...
