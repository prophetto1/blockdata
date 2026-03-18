from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-gcp\src\main\java\io\kestra\plugin\gcp\pubsub\AbstractPubSub.java
# WARNING: Unresolved types: IOException, ProjectSubscriptionName, Publisher

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from integrations.gcp.pubsub.pub_sub_connection_interface import PubSubConnectionInterface
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class AbstractPubSub(ABC, AbstractTask):
    topic: Property[str]

    def create_publisher(self, options: PublisherOptions) -> Publisher:
        raise NotImplementedError  # TODO: translate from Java

    def create_subscription(self, run_context: RunContext, subscription: str, auto_create_subscription: bool) -> ProjectSubscriptionName:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class PublisherOptions:
        enable_message_ordering: bool = False
        run_context: RunContext | None = None
