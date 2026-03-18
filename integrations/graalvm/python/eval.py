from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\python\Eval.java
# WARNING: Unresolved types: Builder, Context, Exception

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

from integrations.graalvm.abstract_eval import AbstractEval
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Eval(AbstractEval):
    """Execute inline Python with GraalVM"""
    m_o_d_u_l_e__p_a_t_h: ClassVar[Path] = Path.of("__kestra_python")
    modules: Property[dict[str, str]] | None = None

    def get_script(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def context_builder(self, run_context: RunContext) -> Context.Builder:
        raise NotImplementedError  # TODO: translate from Java
