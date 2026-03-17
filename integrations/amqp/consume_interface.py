from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-amqp\src\main\java\io\kestra\plugin\amqp\ConsumeInterface.java

from datetime import timedelta
from typing import Any, Protocol

from integrations.amqp.consume_base_interface import ConsumeBaseInterface
from engine.core.models.property.property import Property


class ConsumeInterface(ConsumeBaseInterface, Protocol):
    def get_max_records(self) -> Property[int]: ...

    def get_max_duration(self) -> Property[timedelta]: ...
