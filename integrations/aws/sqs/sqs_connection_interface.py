from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\sqs\SqsConnectionInterface.java

from datetime import timedelta
from typing import Any, Protocol

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from engine.core.models.property.property import Property


class SqsConnectionInterface(AbstractConnectionInterface, Protocol):
    def get_queue_url(self) -> Property[str]: ...

    def get_max_concurrency(self) -> Property[int]: ...

    def get_connection_acquisition_timeout(self) -> Property[timedelta]: ...
