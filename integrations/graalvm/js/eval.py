from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\js\Eval.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.graalvm.abstract_eval import AbstractEval
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Eval(AbstractEval):
    """Execute inline JavaScript with GraalVM"""

    def get_script(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
