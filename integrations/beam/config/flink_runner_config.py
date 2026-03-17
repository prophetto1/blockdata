from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.beam.config.runner_config import RunnerConfig


@dataclass(slots=True, kw_only=True)
class FlinkRunnerConfig(RunnerConfig):
    """Flink runner configuration"""
    execution_mode: str | None = None
    flink_rest_url: str | None = None
    parallelism: int | None = None
    savepoint_dir: str | None = None
    state_backend: str | None = None
    state_backend_storage_path: str | None = None
    jar_path: str | None = None

    def to_pipeline_options(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
