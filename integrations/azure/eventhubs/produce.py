from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\Produce.java
# WARNING: Unresolved types: CreateBatchOptions, Exception, From, InputStream, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.eventhubs.abstract_event_hub_task import AbstractEventHubTask
from integrations.datagen.data import Data
from integrations.azure.eventhubs.client.event_hub_client_factory import EventHubClientFactory
from integrations.azure.eventhubs.service.producer.event_hub_producer_service import EventHubProducerService
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.azure.eventhubs.serdes.serdes import Serdes


@dataclass(slots=True, kw_only=True)
class Produce(AbstractEventHubTask):
    """Publish events to Azure Event Hubs"""
    from: Any
    m_e_t_r_i_c__s_e_n_t__e_v_e_n_t_s__n_a_m_e: ClassVar[str] = "events.sent.count"
    m_e_t_r_i_c__s_e_n_t__b_a_t_c_h_e_s__n_a_m_e: ClassVar[str] = "batches.sent.count"
    event_properties: Property[dict[str, str]] = Property.ofValue(new HashMap<>())
    max_events_per_batch: Property[int] = Property.ofValue(1000)
    body_serializer: Property[Serdes] = Property.ofValue(Serdes.STRING)
    body_serializer_properties: Property[dict[str, Any]] = Property.ofValue(new HashMap<>())
    client_factory: EventHubClientFactory = new EventHubClientFactory()
    partition_key: Property[str] | None = None
    max_batch_size_in_bytes: Property[int] | None = None
    body_content_type: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext, service: EventHubProducerService) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, run_context: RunContext, service: EventHubProducerService, is: InputStream) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_create_batch_options(self, run_context: RunContext) -> CreateBatchOptions:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        events_count: int | None = None
        send_batches_count: int | None = None
