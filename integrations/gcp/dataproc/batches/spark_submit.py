from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.gcp.dataproc.batches.abstract_spark_submit import AbstractSparkSubmit
from integrations.neo4j.batch import Batch
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class SparkSubmit(AbstractSparkSubmit):
    """Submit a Spark batch to Dataproc"""
    main_class: Property[str]

    def build_batch(self, builder: Batch, run_context: RunContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
