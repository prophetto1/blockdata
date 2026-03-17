from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.eventhubs.event_hub_client_interface import EventHubClientInterface
from engine.core.models.property.property import Property
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractEventHubTask(Task, EventHubClientInterface):
    connection_string: Property[str] | None = None
    shared_key_account_name: Property[str] | None = None
    shared_key_account_access_key: Property[str] | None = None
    sas_token: Property[str] | None = None
    client_max_retries: Property[int] | None = None
    client_retry_delay: Property[int] | None = None
    namespace: Property[str] | None = None
    event_hub_name: Property[str] | None = None
    custom_endpoint_address: Property[str] | None = None
