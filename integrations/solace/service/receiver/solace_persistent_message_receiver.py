from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from integrations.solace.service.receiver.receiver_context import ReceiverContext
from integrations.solace.serde.serde import Serde


class MessageListener(Protocol):
    def on_message(self, message: InboundMessageObject) -> None: ...


@dataclass(slots=True, kw_only=True)
class SolacePersistentMessageReceiver:
    serde: Serde | None = None
    logger: Logger | None = None

    def poll(self, messaging_service: MessagingService, context: ReceiverContext, queue: Queue, listener: MessageListener) -> int:
        raise NotImplementedError  # TODO: translate from Java

    def is_completed(self, context: ReceiverContext, total_received_messages: int, time_elapsed_in_millis: int) -> bool:
        raise NotImplementedError  # TODO: translate from Java
