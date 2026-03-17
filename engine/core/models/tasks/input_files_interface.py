from __future__ import annotations

# Source: E:\KESTRA\core\src\main\java\io\kestra\core\models\tasks\InputFilesInterface.java

from typing import Any, Protocol


class InputFilesInterface(Protocol):
    def get_input_files(self) -> Any: ...
