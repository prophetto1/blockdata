from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\batch\BatchService.java
# WARNING: Unresolved types: BatchClient, CloudJob, IOException, MetadataItem

from dataclasses import dataclass
from typing import Any, Optional

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class BatchService:

    @staticmethod
    def client(endpoint: Property[str], account: Property[str], access_key: Property[str], run_context: RunContext) -> BatchClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_existing_job(run_context: RunContext, client: BatchClient, base_job_name: str) -> Optional[CloudJob]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def has_all_labels(run_context: RunContext, metadata: list[MetadataItem]) -> bool:
        raise NotImplementedError  # TODO: translate from Java
