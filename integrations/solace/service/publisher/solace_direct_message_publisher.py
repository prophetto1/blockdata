from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-solace\src\main\java\io\kestra\plugin\solace\service\publisher\SolaceDirectMessagePublisher.java
# WARNING: Unresolved types: DirectMessagePublisher, Logger, MessagePublisher, MessagingService, OutboundMessage, Topic

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.solace.service.publisher.abstract_solace_direct_message_publisher import AbstractSolaceDirectMessagePublisher
from integrations.azure.eventhubs.serdes.serde import Serde


@dataclass(slots=True, kw_only=True)
class SolaceDirectMessagePublisher(AbstractSolaceDirectMessagePublisher):
    d_e_f_a_u_l_t__b_a_c_k_p_r_e_s_s_u_r_e__b_u_f_f_e_r__s_i_z_e: ClassVar[int] = 1
    publisher: DirectMessagePublisher | None = None
    topic: Topic | None = None

    def open(self, messaging_service: MessagingService) -> MessagePublisher:
        raise NotImplementedError  # TODO: translate from Java

    def publish(self, message: OutboundMessage) -> None:
        raise NotImplementedError  # TODO: translate from Java
