from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.airflow.airflow_connection import AirflowConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class TriggerDagRun(AirflowConnection, RunnableTask):
    """Trigger an Airflow DAG run"""
    dag_id: Property[str]
    max_duration: Property[timedelta] | None = None
    poll_frequency: Property[timedelta] | None = None
    wait: Property[bool] | None = None
    body: Property[dict[String, Object]] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_body(self, run_context: RunContext) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        dag_id: str | None = None
        dag_run_id: str | None = None
        state: str | None = None
        started: LocalDateTime | None = None
        ended: LocalDateTime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    dag_id: str | None = None
    dag_run_id: str | None = None
    state: str | None = None
    started: LocalDateTime | None = None
    ended: LocalDateTime | None = None
