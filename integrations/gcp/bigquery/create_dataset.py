from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\bigquery\CreateDataset.java
# WARNING: Unresolved types: Dataset, DatasetInfo, Exception

from dataclasses import dataclass
from enum import Enum
from typing import Any

from integrations.gcp.bigquery.abstract_dataset import AbstractDataset
from integrations.singer.taps.big_query import BigQuery
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateDataset(AbstractDataset):
    """Create or update a BigQuery dataset"""
    if_exists: Property[IfExists] = Property.ofValue(IfExists.ERROR)

    def run(self, run_context: RunContext) -> AbstractDataset.Output:
        raise NotImplementedError  # TODO: translate from Java

    def create(self, connection: BigQuery, run_context: RunContext, dataset_info: DatasetInfo) -> Dataset:
        raise NotImplementedError  # TODO: translate from Java

    class IfExists(str, Enum):
        ERROR = "ERROR"
        UPDATE = "UPDATE"
        SKIP = "SKIP"
