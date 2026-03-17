from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.eventhubs.abstract_event_hub_task import AbstractEventHubTask
from engine.core.models.property.data import Data
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from integrations.azure.eventhubs.service.producer.event_hub_producer_service import EventHubProducerService
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.solace.serde.serdes import Serdes


@dataclass(slots=True, kw_only=True)
class Produce(AbstractEventHubTask, RunnableTask, Data):
    """Publish events to Azure Event Hubs"""
    m_e_t_r_i_c__s_e_n_t__e_v_e_n_t_s__n_a_m_e: str | None = None
    m_e_t_r_i_c__s_e_n_t__b_a_t_c_h_e_s__n_a_m_e: str | None = None
    event_properties: Property[dict[String, String]] | None = None
    from: Any
    partition_key: Property[str] | None = None
    max_batch_size_in_bytes: Property[int] | None = None
    max_events_per_batch: Property[int] | None = None
    body_content_type: Property[str] | None = None
    body_serializer: Property[Serdes] | None = None
    body_serializer_properties: Property[dict[String, Object]] | None = None
    client_factory: EventHubClientFactory | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, service: EventHubProducerService) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, run_context: RunContext, service: EventHubProducerService, is: InputStream) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_create_batch_options(self, run_context: RunContext) -> CreateBatchOptions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        events_count: int | None = None
        send_batches_count: int | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    events_count: int | None = None
    send_batches_count: int | None = None
