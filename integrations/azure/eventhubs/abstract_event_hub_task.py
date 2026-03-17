from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-azure\src\main\java\io\kestra\plugin\azure\eventhubs\AbstractEventHubTask.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.azure.eventhubs.event_hub_client_interface import EventHubClientInterface
from engine.core.models.property.property import Property
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractEventHubTask(ABC, Task):
    client_max_retries: Property[int] = Property.ofValue(5)
    client_retry_delay: Property[int] = Property.ofValue(500L)
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    namespace: Property[str] | None = None
    event_hub_name: Property[str] | None = None
    custom_endpoint_address: Property[str] | None = None
