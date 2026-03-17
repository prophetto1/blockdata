from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-airflow\src\main\java\io\kestra\plugin\airflow\dags\TriggerDagRun.java
# WARNING: Unresolved types: Exception, JsonProcessingException, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from datetime import timedelta
from typing import Any

from integrations.airflow.airflow_connection import AirflowConnection
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TriggerDagRun(AirflowConnection):
    """Trigger an Airflow DAG run"""
    dag_id: Property[str]
    max_duration: Property[timedelta] = Property.ofValue(Duration.ofMinutes(60))
    poll_frequency: Property[timedelta] = Property.ofValue(Duration.ofSeconds(1))
    wait: Property[bool] = Property.ofValue(Boolean.FALSE)
    body: Property[dict[str, Any]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_body(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        dag_id: str | None = None
        dag_run_id: str | None = None
        state: str | None = None
        started: datetime | None = None
        ended: datetime | None = None
