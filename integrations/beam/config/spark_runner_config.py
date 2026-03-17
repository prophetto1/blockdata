from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.beam.config.runner_config import RunnerConfig


@dataclass(slots=True, kw_only=True)
class SparkRunnerConfig(RunnerConfig):
    """Spark runner configuration"""
    master: str | None = None
    jar_path: str | None = None
    checkpoint_dir: str | None = None

    def to_pipeline_options(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
