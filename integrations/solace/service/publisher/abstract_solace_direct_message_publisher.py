from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\service\publisher\AbstractSolaceDirectMessagePublisher.java
# WARNING: Unresolved types: BufferedReader, Exception, Logger, MessagePublisher, MessagingService, OutboundMessage

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class AbstractSolaceDirectMessagePublisher(ABC):
    d_e_f_a_u_l_t__t_e_r_m_i_n_a_t_e__t_i_m_e_o_u_t: ClassVar[int] = Duration.ofMinutes(1).toMillis()
    serde: Serde | None = None
    logger: Logger | None = None

    def logger(self) -> Logger:
        raise NotImplementedError  # TODO: translate from Java

    def send(self, reader: BufferedReader, messaging_service: MessagingService, additional_message_properties: dict[str, str]) -> SendResult:
        raise NotImplementedError  # TODO: translate from Java

    def terminate(self, publisher: MessagePublisher) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @abstractmethod
    def open(self, messaging_service: MessagingService) -> MessagePublisher:
        ...

    @abstractmethod
    def publish(self, message: OutboundMessage) -> None:
        ...

    def build_outbound_message(self, messaging_service: MessagingService, object: OutboundMessageObject, additional_message_properties: dict[str, str]) -> OutboundMessage:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SendResult:
        total_sent_messages: int | None = None

    @dataclass(slots=True)
    class OutboundMessageObject:
        payload: Any | None = None
        properties: dict[str, str] | None = None
