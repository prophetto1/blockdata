from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-beam\src\main\java\io\kestra\plugin\beam\config\FlinkRunnerConfig.java

from dataclasses import dataclass
from typing import Any

from integrations.beam.config.runner_config import RunnerConfig


@dataclass(slots=True, kw_only=True)
class FlinkRunnerConfig:
    """Flink runner configuration"""
    execution_mode: str | None = None
    flink_rest_url: str | None = None
    parallelism: int | None = None
    savepoint_dir: str | None = None
    state_backend: str | None = None
    state_backend_storage_path: str | None = None
    jar_path: str | None = None

    def to_pipeline_options(self) -> dict[str, Any]:
        raise NotImplementedError  # TODO: translate from Java
