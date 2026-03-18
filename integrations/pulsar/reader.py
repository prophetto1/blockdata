from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-pulsar\src\main\java\io\kestra\plugin\pulsar\Reader.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.pulsar.abstract_reader import AbstractReader
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Reader(AbstractReader):
    """Read messages from Pulsar topics without subscription"""
    since: Property[timedelta] | None = None
    message_id: Property[str] | None = None

    def run(self, run_context: RunContext) -> AbstractReader.Output:
        raise NotImplementedError  # TODO: translate from Java
