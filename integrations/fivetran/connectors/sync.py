from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.fivetran.abstract_fivetran_connection import AbstractFivetranConnection
from integrations.fivetran.models.connector import Connector
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Sync(AbstractFivetranConnection, RunnableTask):
    """Trigger and optionally watch connector sync"""
    connector_id: Property[str]
    force: Property[bool] | None = None
    wait: Property[bool] | None = None
    max_duration: Property[timedelta] | None = None
    logged_line: dict[Integer, Integer] | None = None

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_connector(self, run_context: RunContext) -> Connector:
        raise NotImplementedError  # TODO: translate from Java
