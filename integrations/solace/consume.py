from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\Consume.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, ClassVar

from integrations.solace.abstract_solace_task import AbstractSolaceTask
from engine.core.models.property.property import Property
from integrations.solace.service.receiver.queue_types import QueueTypes
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.eventhubs.serdes.serdes import Serdes
from integrations.solace.solace_consume_interface import SolaceConsumeInterface


@dataclass(slots=True, kw_only=True)
class Consume(AbstractSolaceTask):
    """Consume messages from Solace queue"""
    queue_name: Property[str]
    queue_type: Property[QueueTypes]
    m_e_t_r_i_c__s_e_n_t__m_e_s_s_a_g_e_s__n_a_m_e: ClassVar[str] = "total-received-messages"
    message_deserializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    message_deserializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    max_messages: Property[int] = Property.ofValue(100)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofSeconds(10))
    message_selector: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, task: SolaceConsumeInterface) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages_count: int | None = None
        uri: str | None = None
