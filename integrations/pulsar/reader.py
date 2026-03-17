from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.pulsar.abstract_reader import AbstractReader
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Reader(AbstractReader):
    """Read messages from Pulsar topics without subscription"""
    since: Property[timedelta] | None = None
    message_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> AbstractReader:
        raise NotImplementedError  # TODO: translate from Java
