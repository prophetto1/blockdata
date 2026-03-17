from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_load import AbstractLoad
from integrations.opensearch.model.op_type import OpType
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Load(AbstractLoad, RunnableTask):
    """Bulk load records from Internal Storage"""
    index: Property[str]
    op_type: Property[OpType] | None = None
    id_key: Property[str] | None = None
    remove_id_key: Property[bool] | None = None

    def source(self, run_context: RunContext, input_stream: BufferedReader) -> Flux[BulkOperation]:
        raise NotImplementedError  # TODO: translate from Java
