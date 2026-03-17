from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.client.azure_client_config import AzureClientConfig
from integrations.azure.eventhubs.config.blob_container_client_config import BlobContainerClientConfig
from integrations.azure.eventhubs.config.event_hub_client_config import EventHubClientConfig
from integrations.azure.eventhubs.config.event_hub_consumer_config import EventHubConsumerConfig


@dataclass(slots=True, kw_only=True)
class EventHubClientFactory:
    log: Logger | None = None

    def create_async_producer_client(self, config: EventHubClientConfig[Any]) -> EventHubProducerAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

    def fully_qualified_namespace(self, config: EventHubClientConfig[Any]) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def create_event_processor_client_builder(self, config: EventHubConsumerConfig) -> EventProcessorClientBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def create_builder(self, config: EventHubClientConfig[Any]) -> EventHubClientBuilder:
        raise NotImplementedError  # TODO: translate from Java

    def get_retry_options(self, config: EventHubClientConfig[Any]) -> AmqpRetryOptions:
        raise NotImplementedError  # TODO: translate from Java

    def create_blob_container_async_client(self, config: BlobContainerClientConfig) -> BlobContainerAsyncClient:
        raise NotImplementedError  # TODO: translate from Java

    def connection_string(self, config: AzureClientConfig[Any], client_name: str) -> Optional[String]:
        raise NotImplementedError  # TODO: translate from Java

    def sas_credential(self, config: AzureClientConfig[Any], client_name: str) -> Optional[AzureSasCredential]:
        raise NotImplementedError  # TODO: translate from Java

    def named_key_credential(self, config: AzureClientConfig[Any], client_name: str) -> Optional[AzureNamedKeyCredential]:
        raise NotImplementedError  # TODO: translate from Java
