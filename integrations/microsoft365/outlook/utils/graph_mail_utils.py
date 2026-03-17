from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.googleworkspace.mail.models.attachment import Attachment
from integrations.mqtt.services.message import Message


@dataclass(slots=True, kw_only=True)
class GraphMailUtils:

    def fetch_message(self, graph_client: GraphServiceClient, user_id: str, message_id: str) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_attachments(self, graph_client: GraphServiceClient, user_id: str, message_id: str) -> list[Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_messages(self, graph_client: GraphServiceClient, user_id: str, folder_id: str, filter_expression: str, max_results: int, logger: Logger) -> MessageCollectionResponse:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_messages_for_trigger(self, graph_client: GraphServiceClient, user_id: str, folder_id: str, filter_expression: str, max_results: int) -> list[Message]:
        raise NotImplementedError  # TODO: translate from Java
