from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cobol\src\main\java\io\kestra\plugin\cobol\CallJob.java
# WARNING: Unresolved types: AS400, Exception, ProgramParameter, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from integrations.cobol.abstract_as400_connection import AbstractAs400Connection
from integrations.cobol.message_output import MessageOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CallJob(AbstractAs400Connection):
    """Call an IBM i COBOL program synchronously."""
    library: Property[str]
    program: Property[str]
    parameters: Property[list[str]] = Property.ofValue(Collections.emptyList())
    program_timeout: Property[int] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def build_parameters(self, params: list[str], system: AS400) -> list[ProgramParameter]:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        messages: list[MessageOutput] | None = None
        job_name: str | None = None
        job_number: str | None = None
        job_user: str | None = None
        duration: timedelta | None = None
