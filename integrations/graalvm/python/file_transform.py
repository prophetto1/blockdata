from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\python\FileTransform.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.graalvm.abstract_file_transform import AbstractFileTransform
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class FileTransform(AbstractFileTransform):
    """Transform rows with Python on GraalVM"""

    def get_script(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java
