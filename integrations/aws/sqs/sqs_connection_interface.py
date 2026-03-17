from __future__ import annotations

from typing import Any, Protocol
from datetime import timedelta

from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from engine.core.models.property.property import Property


class SqsConnectionInterface(AbstractConnectionInterface):
    def get_queue_url(self) -> Property[str]: ...
    def get_max_concurrency(self) -> Property[int]: ...
    def get_connection_acquisition_timeout(self) -> Property[timedelta]: ...
