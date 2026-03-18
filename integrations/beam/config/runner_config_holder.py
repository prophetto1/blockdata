from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\config\RunnerConfigHolder.java

from dataclasses import dataclass
from typing import Any

from integrations.beam.config.runner_config import RunnerConfig


@dataclass(slots=True, kw_only=True)
class RunnerConfigHolder:
    options: dict[str, Any] | None = None
    config: RunnerConfig | None = None
