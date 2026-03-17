from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\eventbridge\PutEvents.java
# WARNING: Unresolved types: EventBridgeClient, Exception, IOException, ObjectMapper, PutEventsResponse, URISyntaxException, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar, Optional

from integrations.aws.abstract_connection import AbstractConnection
from integrations.aws.eventbridge.model.entry import Entry
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.flows.state import State
from engine.core.models.flows.type import Type


@dataclass(slots=True, kw_only=True)
class PutEvents(AbstractConnection):
    """Send events to Amazon EventBridge"""
    entries: Any
    m_a_p_p_e_r: ClassVar[ObjectMapper] = JacksonMapper.ofIon()
        .setSerializationInclusion(JsonInclude.Include.ALWAYS)
    fail_on_unsuccessful_events: Property[bool] = Property.ofValue(true)

    def run(self, run_context: RunContext) -> PutEvents.Output:
        raise NotImplementedError  # TODO: translate from Java

    def write_output_file(self, run_context: RunContext, put_events_response: PutEventsResponse, entry_list: list[Entry]) -> Path:
        raise NotImplementedError  # TODO: translate from Java

    def put_events(self, run_context: RunContext, entry_list: list[Entry]) -> PutEventsResponse:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> EventBridgeClient:
        raise NotImplementedError  # TODO: translate from Java

    def read_entry_list(self, run_context: RunContext, entries: Any) -> list[Entry]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        uri: str | None = None
        failed_entry_count: int | None = None
        entry_count: int | None = None

        def final_state(self) -> Optional[State.Type]:
            raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class OutputEntry:
        event_id: str | None = None
        error_code: str | None = None
        error_message: str | None = None
        entry: Entry | None = None
