from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-cobol\src\main\java\io\kestra\plugin\cobol\CreateProgram.java
# WARNING: Unresolved types: AS400, Exception, Pattern, core, io, kestra, models, tasks

from dataclasses import dataclass, field
from typing import Any, ClassVar

from integrations.cobol.abstract_as400_connection import AbstractAs400Connection
from integrations.cobol.message_output import MessageOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class CreateProgram(AbstractAs400Connection):
    """Create (compile) a COBOL program on IBM i."""
    library: Property[str]
    program: Property[str]
    c_o_m_p_i_l_e__o_p_t_i_o_n_s__p_a_t_t_e_r_n: ClassVar[Pattern] = Pattern.compile("^[A-Za-z][A-Za-z0-9_]*\\([^()]*\\)(\\s+[A-Za-z][A-Za-z0-9_]*\\([^()]*\\))*$")
    source_inline: Property[str] | None = None
    source_uri: Property[str] | None = None
    compile_options: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def read_source_from_uri(self, run_context: RunContext, uri: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    def upload_source_to_ifs(self, system: AS400, ifs_path: str, content: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def sanitize_compile_options(self, compile_options: str) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        program_path: str | None = None
        compile_messages: list[MessageOutput] | None = None
