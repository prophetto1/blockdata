from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\config\SparkRunnerConfig.java

from dataclasses import dataclass
from typing import Any

from integrations.beam.config.runner_config import RunnerConfig


@dataclass(slots=True, kw_only=True)
class SparkRunnerConfig:
    """Spark runner configuration"""
    master: str | None = None
    jar_path: str | None = None
    checkpoint_dir: str | None = None

    def to_pipeline_options(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
