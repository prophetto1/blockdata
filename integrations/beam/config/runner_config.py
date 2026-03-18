from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\config\RunnerConfig.java

from typing import Any, Protocol


class RunnerConfig(Protocol):
    def to_pipeline_options(self) -> dict[str, Any]: ...
