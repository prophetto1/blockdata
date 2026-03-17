from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta
from pathlib import Path

from integrations.dbt.cloud.abstract_dbt_cloud import AbstractDbtCloud
from integrations.dbt.cloud.models.job_status_humanized_enum import JobStatusHumanizedEnum
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.dbt.cloud.models.run_response import RunResponse
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CheckStatus(AbstractDbtCloud, RunnableTask):
    """Monitor a dbt Cloud run"""
    e_n_d_e_d__s_t_a_t_u_s: list[JobStatusHumanizedEnum] | None = None
    run_id: Property[str]
    poll_frequency: Property[timedelta] | None = None
    max_duration: Property[timedelta] | None = None
    parse_run_results: Property[bool] | None = None
    logged_status: list[JobStatusHumanizedEnum] | None = None
    logged_steps: dict[Long, Long] | None = None

    def run(self, run_context: RunContext) -> CheckStatus:
        raise NotImplementedError  # TODO: translate from Java

    def log_steps(self, logger: Logger, run_response: RunResponse) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_run_response(self, run_context: RunContext, id: int, debug: bool) -> Optional[RunResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def download_artifacts(self, run_context: RunContext, run_id: int, path: str, response_type: Class[T]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        run_results: str | None = None
        manifest: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    run_results: str | None = None
    manifest: str | None = None
