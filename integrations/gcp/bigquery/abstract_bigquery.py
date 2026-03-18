from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\AbstractBigquery.java
# WARNING: Unresolved types: Callable, GoogleCredentials, IOException, Logger, Throwable

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.models.tasks.retrys.abstract_retry import AbstractRetry
from integrations.compress.abstract_task import AbstractTask
from integrations.singer.taps.big_query import BigQuery
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractBigquery(ABC, AbstractTask):
    retry_reasons: Property[list[str]] = Property.ofValue(Arrays.asList(
        "rateLimitExceeded",
        "jobBackendError",
        "backendError",
        "internalError",
        "jobInternalError"
    ))
    retry_messages: Property[list[str]] = Property.ofValue(Arrays.asList(
        "due to concurrent update",
        "Retrying the job may solve the problem",
        "Retrying may solve the problem"
    ))
    location: Property[str] | None = None
    retry_auto: AbstractRetry | None = None

    def connection(self, run_context: RunContext) -> BigQuery:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def connection(run_context: RunContext, google_credentials: GoogleCredentials, project_id: str, location: str) -> BigQuery:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_job(self, logger: Logger, create_job: Callable[Job], run_context: RunContext) -> Job:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_job(self, logger: Logger, create_job: Callable[Job], dry_run: bool, run_context: RunContext) -> Job:
        raise NotImplementedError  # TODO: translate from Java

    def should_retry(self, failure: Throwable, logger: Logger, run_context: RunContext) -> bool:
        raise NotImplementedError  # TODO: translate from Java
