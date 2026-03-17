from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.eventhubs.service.producer.event_data_batch_factory import EventDataBatchFactory
from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.azure.eventhubs.service.event_data_object_converter import EventDataObjectConverter
from integrations.azure.eventhubs.config.event_hub_client_config import EventHubClientConfig
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from integrations.azure.eventhubs.service.producer.producer_context import ProducerContext
from engine.core.models.collectors.result import Result


@dataclass(slots=True, kw_only=True)
class EventHubProducerService:
    d_e_f_a_u_l_t__m_a_x__e_v_e_n_t__p_e_r__b_a_t_c_h: int | None = None
    client_factory: EventHubClientFactory | None = None
    config: EventHubClientConfig | None = None
    adapter: EventDataObjectConverter | None = None
    batch_factory: EventDataBatchFactory | None = None

    def send_events(self, event_stream: BufferedReader, context: ProducerContext) -> Result:
        raise NotImplementedError  # TODO: translate from Java

    def send_events(self, producer: EventHubProducerAsyncClient, adapter: EventDataObjectConverter, flowable: Flux[EventDataObject], context: ProducerContext) -> Result:
        raise NotImplementedError  # TODO: translate from Java
