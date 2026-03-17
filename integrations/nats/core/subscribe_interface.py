from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-nats\src\main\java\io\kestra\plugin\nats\core\SubscribeInterface.java
# WARNING: Unresolved types: DeliverPolicy

from typing import Any, Protocol

from engine.core.models.property.property import Property


class SubscribeInterface(Protocol):
    def get_subject(self) -> str: ...

    def get_durable_id(self) -> Property[str]: ...

    def get_since(self) -> Property[str]: ...

    def get_batch_size(self) -> int: ...

    def get_deliver_policy(self) -> Property[DeliverPolicy]: ...
