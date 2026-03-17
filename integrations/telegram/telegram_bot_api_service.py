from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.http.http_response import HttpResponse


@dataclass(slots=True, kw_only=True)
class TelegramBotApiService:

    def send(self, client: HttpClient, destination_id: str, api_token: str, message: str, url: str, request_builder: HttpRequest, parse_mode: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TelegramMessage:
        chat_id: str | None = None
        text: str | None = None
        parse_mode: str | None = None
        message_id: int | None = None

    @dataclass(slots=True)
    class ErrorSendingMessageException(Exception):
        http_status: HttpResponse | None = None


@dataclass(slots=True, kw_only=True)
class TelegramMessage:
    chat_id: str | None = None
    text: str | None = None
    parse_mode: str | None = None
    message_id: int | None = None


@dataclass(slots=True, kw_only=True)
class ErrorSendingMessageException(Exception):
    http_status: HttpResponse | None = None
