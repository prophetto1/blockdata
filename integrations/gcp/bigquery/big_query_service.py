from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\BigQueryService.java
# WARNING: Unresolved types: JobId, Logger, TableId

from dataclasses import dataclass
from typing import Any

from integrations.gcp.bigquery.abstract_bigquery import AbstractBigquery
from integrations.gcp.bigquery.big_query_exception import BigQueryException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.airbyte.models.job import Job
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BigQueryService:

    @staticmethod
    def job_id(run_context: RunContext, abstract_bigquery: AbstractBigquery) -> JobId:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def table_id(table: str) -> TableId:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def handle_errors(job: Job, logger: Logger) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def labels(run_context: RunContext) -> dict[str, str]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def sanitize_label(label: str) -> str:
        raise NotImplementedError  # TODO: translate from Java
