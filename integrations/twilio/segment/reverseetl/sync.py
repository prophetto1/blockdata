from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-twilio\src\main\java\io\kestra\plugin\twilio\segment\reverseetl\Sync.java
# WARNING: Unresolved types: Exception, ReverseETLManualSync, TimeoutException, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.twilio.segment.abstract_segment_connection import AbstractSegmentConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_response import ReverseEtlSyncResponse
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status import ReverseEtlSyncStatus
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status_response import ReverseEtlSyncStatusResponse
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Sync(AbstractSegmentConnection):
    """Trigger a Segment Reverse ETL sync"""
    source_id: Property[str]
    model_id: Property[str]
    subscription_id: Property[str]
    wait: Property[bool] = Property.ofValue(false)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofHours(1))
    poll_interval: Property[timedelta] = Property.ofValue(Duration.ofSeconds(5))
    error_on_failing: Property[bool] = Property.ofValue(false)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion(self, run_context: RunContext, sync_id: str) -> ReverseEtlSyncStatus:
        raise NotImplementedError  # TODO: translate from Java

    def get_status(self, run_context: RunContext, model_id: Property[str], sync_id: str) -> ReverseEtlSyncStatusResponse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        sync_id: str | None = None
        created: ReverseEtlSyncResponse.ReverseETLManualSync | None = None
        status: ReverseEtlSyncStatus | None = None
