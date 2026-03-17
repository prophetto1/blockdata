from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notifications\src\main\java\io\kestra\plugin\notifications\telegram\TelegramBotApiService.java
# WARNING: Unresolved types: Exception, HttpRequestBuilder, Throwable

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse
from integrations.argocd.apps.status import Status


@dataclass(slots=True, kw_only=True)
class TelegramBotApiService:

    @staticmethod
    def send(client: HttpClient, destination_id: str, api_token: str, message: str, url: str, request_builder: HttpRequest.HttpRequestBuilder, parse_mode: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TelegramBotApiResponse:
        ok: bool | None = None
        result: TelegramMessage | None = None

    @dataclass(slots=True)
    class TelegramMessage:
        chat_id: str | None = None
        text: str | None = None
        parse_mode: str | None = None
        message_id: int | None = None

    @dataclass(slots=True)
    class ErrorSendingMessageException(Exception):
        http_status: HttpResponse.Status | None = None
