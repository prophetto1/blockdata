from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-microsoft365\src\main\java\io\kestra\plugin\microsoft365\outlook\utils\GraphMailUtils.java
# WARNING: Unresolved types: GraphServiceClient, Logger, MessageCollectionResponse

from dataclasses import dataclass
from typing import Any

from integrations.googleworkspace.mail.models.attachment import Attachment
from integrations.amqp.models.message import Message


@dataclass(slots=True, kw_only=True)
class GraphMailUtils:

    @staticmethod
    def fetch_message(graph_client: GraphServiceClient, user_id: str, message_id: str) -> Message:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fetch_attachments(graph_client: GraphServiceClient, user_id: str, message_id: str) -> list[Attachment]:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fetch_messages(graph_client: GraphServiceClient, user_id: str, folder_id: str, filter_expression: str, max_results: int, logger: Logger) -> MessageCollectionResponse:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def fetch_messages_for_trigger(graph_client: GraphServiceClient, user_id: str, folder_id: str, filter_expression: str, max_results: int) -> list[Message]:
        raise NotImplementedError  # TODO: translate from Java
