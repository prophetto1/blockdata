from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\dataproc\batches\SparkSubmit.java
# WARNING: Unresolved types: Builder

from dataclasses import dataclass
from typing import Any

from integrations.gcp.dataproc.batches.abstract_spark_submit import AbstractSparkSubmit
from integrations.azure.storage.cosmosdb.batch import Batch
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkSubmit(AbstractSparkSubmit):
    """Submit a Spark batch to Dataproc"""
    main_class: Property[str]

    def build_batch(self, builder: Batch.Builder, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
