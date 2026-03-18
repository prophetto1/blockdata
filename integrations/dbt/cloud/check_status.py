from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-dbt\src\main\java\io\kestra\plugin\dbt\cloud\CheckStatus.java
# WARNING: Unresolved types: Class, Exception, IOException, Logger, T, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from pathlib import Path
from datetime import timedelta
from typing import Any, ClassVar, Optional

from integrations.dbt.cloud.abstract_dbt_cloud import AbstractDbtCloud
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.dbt.cloud.models.job_status_humanized_enum import JobStatusHumanizedEnum
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from integrations.dbt.cloud.models.run_response import RunResponse
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CheckStatus(AbstractDbtCloud):
    """Monitor a dbt Cloud run"""
    run_id: Property[str]
    e_n_d_e_d__s_t_a_t_u_s: ClassVar[list[JobStatusHumanizedEnum]] = List.of(
            JobStatusHumanizedEnum.ERROR,
            JobStatusHumanizedEnum.CANCELLED,
            JobStatusHumanizedEnum.SUCCESS
    )
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    parse_run_results: Property[bool] = Property.ofValue(Boolean.TRUE)
    logged_status: list[JobStatusHumanizedEnum] = field(default_factory=list)
    logged_steps: dict[int, int] = field(default_factory=dict)

    def run(self, run_context: RunContext) -> CheckStatus.Output:
        raise NotImplementedError  # TODO: translate from Java

    def log_steps(self, logger: Logger, run_response: RunResponse) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_run_response(self, run_context: RunContext, id: int, debug: bool) -> Optional[RunResponse]:
        raise NotImplementedError  # TODO: translate from Java

    def download_artifacts(self, run_context: RunContext, run_id: int, path: str, response_type: Class[T]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        run_results: str | None = None
        manifest: str | None = None
