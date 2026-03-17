from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import timedelta

from integrations.cobol.abstract_as400_connection import AbstractAs400Connection
from integrations.slack.app.models.message_output import MessageOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CallJob(AbstractAs400Connection, RunnableTask):
    """Call an IBM i COBOL program synchronously."""
    library: Property[str]
    program: Property[str]
    parameters: Property[list[String]] | None = None
    program_timeout: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_parameters(self, params: list[String], system: AS400) -> ProgramParameter:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        messages: list[MessageOutput] | None = None
        job_name: str | None = None
        job_number: str | None = None
        job_user: str | None = None
        duration: timedelta | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    messages: list[MessageOutput] | None = None
    job_name: str | None = None
    job_number: str | None = None
    job_user: str | None = None
    duration: timedelta | None = None
