from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\services\ai\MetadataAppenderChatModelListener.java
# WARNING: Unresolved types: ChatModelListener, ChatModelRequestContext, ConversationMetadata, Supplier

from dataclasses import dataclass, field
from typing import Any, ClassVar

from engine.webserver.services.ai.ai_service import AiService


@dataclass(slots=True, kw_only=True)
class MetadataAppenderChatModelListener:
    s_p_a_n__n_a_m_e: ClassVar[str] = "spanName"
    p_a_r_e_n_t__i_d: ClassVar[str] = "parentId"
    s_t_a_r_t__t_i_m_e__k_e_y__n_a_m_e: ClassVar[str] = "startTime"
    c_o_n_v_e_r_s_a_t_i_o_n__i_d: ClassVar[str] = "conversationId"
    i_p: ClassVar[str] = "ip"
    i_n_s_t_a_n_c_e__u_i_d: ClassVar[str] = "instanceUid"
    p_r_o_v_i_d_e_r: ClassVar[str] = "provider"
    instance_uid: str | None = None
    provider: str | None = None
    span_name: str | None = None
    conversation_metadata_getter: Supplier[AiService.ConversationMetadata] | None = None

    def on_request(self, request_context: ChatModelRequestContext) -> None:
        raise NotImplementedError  # TODO: translate from Java
