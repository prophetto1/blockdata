from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\reverseetl\Status.java
# WARNING: Unresolved types: IOException, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.twilio.segment.abstract_segment_connection import AbstractSegmentConnection
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status import ReverseEtlSyncStatus
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Status(AbstractSegmentConnection):
    """Fetch Segment Reverse ETL sync status"""
    model_id: Property[str]
    sync_id: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        status: ReverseEtlSyncStatus | None = None
