from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from integrations.gcp.pubsub.pub_sub_connection_interface import PubSubConnectionInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractPubSub(AbstractTask, PubSubConnectionInterface):
    topic: Property[str]

    def create_publisher(self, options: PublisherOptions) -> Publisher:
        raise NotImplementedError  # TODO: translate from Java

    def create_subscription(self, run_context: RunContext, subscription: str, auto_create_subscription: bool) -> ProjectSubscriptionName:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PublisherOptions:
        run_context: RunContext | None = None
        enable_message_ordering: bool = False


@dataclass(slots=True, kw_only=True)
class PublisherOptions:
    run_context: RunContext | None = None
    enable_message_ordering: bool = False
