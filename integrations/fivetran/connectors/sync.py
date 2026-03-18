from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fivetran\src\main\java\io\kestra\plugin\fivetran\connectors\Sync.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from integrations.fivetran.abstract_fivetran_connection import AbstractFivetranConnection
from integrations.fivetran.models.connector import Connector
from engine.core.http.client.http_client_exception import HttpClientException
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from engine.core.models.tasks.void_output import VoidOutput


@dataclass(slots=True, kw_only=True)
class Sync(AbstractFivetranConnection):
    """Trigger and optionally watch connector sync"""
    connector_id: Property[str]
    force: Property[bool] = Property.ofValue(false)
    wait: Property[bool] = Property.ofValue(true)
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    logged_line: dict[int, int] = field(default_factory=dict)

    def run(self, run_context: RunContext) -> VoidOutput:
        raise NotImplementedError  # TODO: translate from Java

    def fetch_connector(self, run_context: RunContext) -> Connector:
        raise NotImplementedError  # TODO: translate from Java
