from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.beam.config.runner_config import RunnerConfig


@dataclass(slots=True, kw_only=True)
class DataflowRunnerConfig(RunnerConfig):
    """Dataflow runner configuration"""
    project_id: str | None = None
    region: str | None = None
    temp_location: str | None = None
    staging_location: str | None = None
    service_account_key: str | None = None
    update: bool | None = None
    max_workers: int | None = None
    worker_machine_type: str | None = None
    network: str | None = None
    subnetwork: str | None = None

    def to_pipeline_options(self) -> dict[String, Object]:
        raise NotImplementedError  # TODO: translate from Java
