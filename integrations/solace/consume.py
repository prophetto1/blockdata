from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.solace.abstract_solace_task import AbstractSolaceTask
from engine.core.models.property.property import Property
from integrations.solace.service.receiver.queue_types import QueueTypes
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.solace.serde.serdes import Serdes
from integrations.solace.solace_consume_interface import SolaceConsumeInterface


@dataclass(slots=True, kw_only=True)
class Consume(AbstractSolaceTask, SolaceConsumeInterface, RunnableTask):
    """Consume messages from Solace queue"""
    m_e_t_r_i_c__s_e_n_t__m_e_s_s_a_g_e_s__n_a_m_e: str | None = None
    queue_name: Property[str]
    queue_type: Property[QueueTypes]
    message_deserializer: Property[Serdes] | None = None
    message_deserializer_properties: Property[dict[String, Object]] | None = None
    max_messages: Property[int] | None = None
    max_duration: Property[timedelta] | None = None
    message_selector: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, task: SolaceConsumeInterface) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages_count: int | None = None
        uri: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages_count: int | None = None
    uri: str | None = None
