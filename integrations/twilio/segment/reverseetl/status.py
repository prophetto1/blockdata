from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.twilio.segment.abstract_segment_connection import AbstractSegmentConnection
from engine.core.models.property.property import Property
from integrations.twilio.segment.reverseetl.models.reverse_etl_sync_status import ReverseEtlSyncStatus
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Status(AbstractSegmentConnection, RunnableTask):
    """Fetch Segment Reverse ETL sync status"""
    model_id: Property[str]
    sync_id: Property[str]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        status: ReverseEtlSyncStatus | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    status: ReverseEtlSyncStatus | None = None
