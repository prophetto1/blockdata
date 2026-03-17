from __future__ import annotations

from typing import Any, Protocol
from datetime import timedelta

from integrations.kafka.kafka_consumer_interface import KafkaConsumerInterface
from engine.core.models.property.property import Property


class ConsumeInterface(KafkaConsumerInterface):
    def get_max_records(self) -> Property[int]: ...
    def get_max_duration(self) -> Property[timedelta]: ...
    def get_poll_duration(self) -> Property[timedelta]: ...
