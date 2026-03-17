from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\service\producer\EventHubProducerService.java
# WARNING: Unresolved types: BufferedReader, EventHubProducerAsyncClient, Flux, IOException

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.eventhubs.service.producer.event_data_batch_factory import EventDataBatchFactory
from integrations.azure.eventhubs.model.event_data_object import EventDataObject
from integrations.azure.eventhubs.service.event_data_object_converter import EventDataObjectConverter
from integrations.azure.eventhubs.config.event_hub_client_config import EventHubClientConfig
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.azure.eventhubs.service.producer.producer_context import ProducerContext


@dataclass(slots=True, kw_only=True)
class EventHubProducerService:
    d_e_f_a_u_l_t__m_a_x__e_v_e_n_t__p_e_r__b_a_t_c_h: ClassVar[int] = Integer.MAX_VALUE
    client_factory: EventHubClientFactory | None = None
    config: EventHubClientConfig | None = None
    adapter: EventDataObjectConverter | None = None
    batch_factory: EventDataBatchFactory | None = None

    def send_events(self, event_stream: BufferedReader, context: ProducerContext) -> Result:
        raise NotImplementedError  # TODO: translate from Java

    def send_events(self, producer: EventHubProducerAsyncClient, adapter: EventDataObjectConverter, flowable: Flux[EventDataObject], context: ProducerContext) -> Result:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Result:
        total_sent_events: int | None = None
        total_sent_batches: int | None = None
