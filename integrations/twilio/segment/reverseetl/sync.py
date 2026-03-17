from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.twilio.segment.abstract_segment_connection import AbstractSegmentConnection
from engine.core.models.property.property import Property
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_response import ReverseEtlSyncResponse
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status import ReverseEtlSyncStatus
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status_response import ReverseEtlSyncStatusResponse
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Sync(AbstractSegmentConnection, RunnableTask):
    """Trigger a Segment Reverse ETL sync"""
    source_id: Property[str]
    model_id: Property[str]
    subscription_id: Property[str]
    wait: Property[bool] | None = None
    max_duration: Property[timedelta] | None = None
    poll_interval: Property[timedelta] | None = None
    error_on_failing: Property[bool] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def wait_for_completion(self, run_context: RunContext, sync_id: str) -> ReverseEtlSyncStatus:
        raise NotImplementedError  # TODO: translate from Java

    def get_status(self, run_context: RunContext, model_id: Property[str], sync_id: str) -> ReverseEtlSyncStatusResponse:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        sync_id: str | None = None
        created: ReverseEtlSyncResponse | None = None
        status: ReverseEtlSyncStatus | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    sync_id: str | None = None
    created: ReverseEtlSyncResponse | None = None
    status: ReverseEtlSyncStatus | None = None
