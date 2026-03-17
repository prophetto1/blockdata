from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cobol\src\main\java\io\kestra\plugin\cobol\SubmitJob.java
# WARNING: Unresolved types: Exception, Pattern, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.cobol.abstract_as400_connection import AbstractAs400Connection
from integrations.cobol.message_output import MessageOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class SubmitJob(AbstractAs400Connection):
    """Submit an IBM i COBOL job asynchronously."""
    library: Property[str]
    program: Property[str]
    j_o_b__i_d_e_n_t_i_t_y__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("\\b(\\d{6})/([A-Za-z0-9_$#@]+)/([A-Za-z0-9_$#@]+)\\b")
    parameters: Property[list[str]] = Property.ofValue(Collections.emptyList())
    job_name: Property[str] | None = None
    job_queue: Property[str] | None = None
    user_profile: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def extract_submitted_job(self, messages: list[MessageOutput]) -> SubmittedJob:
        raise NotImplementedError  # TODO: translate from Java

    def find_submitted_job(self, messages: list[MessageOutput], only_known_submitted_message_id: bool) -> SubmittedJob:
        raise NotImplementedError  # TODO: translate from Java

    def format_parameters(self, r_params: list[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class SubmittedJob:
        number: str | None = None
        user: str | None = None
        name: str | None = None

    @dataclass(slots=True)
    class Output:
        messages: list[MessageOutput] | None = None
        job_name: str | None = None
        job_number: str | None = None
        job_user: str | None = None
