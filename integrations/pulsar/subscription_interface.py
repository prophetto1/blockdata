from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\SubscriptionInterface.java
# WARNING: Unresolved types: SubscriptionInitialPosition, SubscriptionType

from typing import Any, Protocol

from engine.core.models.property.property import Property


class SubscriptionInterface(Protocol):
    def get_subscription_name(self) -> Property[str]: ...

    def get_initial_position(self) -> Property[SubscriptionInitialPosition]: ...

    def get_subscription_type(self) -> Property[SubscriptionType]: ...

    def get_consumer_properties(self) -> Property[dict[str, str]]: ...

    def get_encryption_key(self) -> Property[str]: ...

    def get_consumer_name(self) -> Property[str]: ...
