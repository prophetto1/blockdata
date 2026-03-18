from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\service\receiver\SolacePersistentMessageReceiver.java
# WARNING: Unresolved types: Logger, MessagingService, Queue

from dataclasses import dataclass
from typing import Any, Protocol

from integrations.solace.service.receiver.receiver_context import ReceiverContext
from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class SolacePersistentMessageReceiver:
    serde: Serde | None = None
    logger: Logger | None = None

    def poll(self, messaging_service: MessagingService, context: ReceiverContext, queue: Queue, listener: MessageListener) -> int:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def is_completed(context: ReceiverContext, total_received_messages: int, time_elapsed_in_millis: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java

    class MessageListener(Protocol):
        def on_message(self, message: InboundMessageObject) -> None: ...

    @dataclass(slots=True)
    class InboundMessageObject:
        sender_id: str | None = None
        sender_timestamp: int | None = None
        destination_name: str | None = None
        application_message_id: str | None = None
        application_message_type: str | None = None
        correlation_id: str | None = None
        is_redelivered: bool | None = None
        payload: Any | None = None
        properties: dict[str, str] | None = None
