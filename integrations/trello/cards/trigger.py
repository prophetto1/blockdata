from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime
from datetime import timedelta

from engine.core.models.triggers.abstract_trigger import AbstractTrigger
from engine.core.models.conditions.condition_context import ConditionContext
from engine.core.models.executions.execution import Execution
from engine.core.http.client.http_client import HttpClient
from engine.core.http.http_request import HttpRequest
from engine.core.models.triggers.polling_trigger_interface import PollingTriggerInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.triggers.trigger_context import TriggerContext
from engine.core.models.triggers.trigger_output import TriggerOutput


@dataclass(slots=True, kw_only=True)
class Trigger(AbstractTrigger, PollingTriggerInterface, TriggerOutput):
    """Trigger on Trello card creation or update"""
    api_key: Property[str]
    api_token: Property[str]
    api_version: Property[str] | None = None
    api_base_url: Property[str] | None = None
    lists: Property[list[String]] | None = None
    board_id: Property[str] | None = None
    interval: timedelta | None = None

    def get_interval(self) -> timedelta:
        raise NotImplementedError  # TODO: translate from Java

    def evaluate(self, condition_context: ConditionContext, context: TriggerContext) -> Optional[Execution]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cards_from_board(self, run_context: RunContext, http_client: HttpClient, base_url: str, version: str, api_key: str, api_token: str, board_id: str, last_check_time: datetime) -> list[CardData]:
        raise NotImplementedError  # TODO: translate from Java

    def get_cards_from_list(self, run_context: RunContext, http_client: HttpClient, base_url: str, version: str, api_key: str, api_token: str, list_id: str, last_check_time: datetime) -> list[CardData]:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_and_filter_cards(self, run_context: RunContext, http_client: HttpClient, url: str, api_key: str, api_token: str, last_check_time: datetime) -> list[CardData]:
        raise NotImplementedError  # TODO: translate from Java

    def parse_card_data(self, card_node: JsonNode, last_check_time: datetime) -> CardData:
        raise NotImplementedError  # TODO: translate from Java

    def build_api_url(self, base_url: str, version: str, endpoint: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def add_auth_headers(self, api_key: str, api_token: str, builder: HttpRequest) -> HttpRequest:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        count: int | None = None
        cards: list[CardData] | None = None

    @dataclass(slots=True)
    class CardData:
        card_id: str | None = None
        card_name: str | None = None
        card_url: str | None = None
        card_description: str | None = None
        last_activity: datetime | None = None
        action: str | None = None
        list_id: str | None = None
        board_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    count: int | None = None
    cards: list[CardData] | None = None


@dataclass(slots=True, kw_only=True)
class CardData:
    card_id: str | None = None
    card_name: str | None = None
    card_url: str | None = None
    card_description: str | None = None
    last_activity: datetime | None = None
    action: str | None = None
    list_id: str | None = None
    board_id: str | None = None
