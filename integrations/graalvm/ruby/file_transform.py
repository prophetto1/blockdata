from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-graalvm\src\main\java\io\kestra\plugin\graalvm\ruby\FileTransform.java
# WARNING: Unresolved types: Context, Exception, Value

from dataclasses import dataclass
from typing import Any

from integrations.graalvm.abstract_file_transform import AbstractFileTransform
from integrations.aws.glue.model.output import Output
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class FileTransform(AbstractFileTransform):
    """Transform rows with Ruby on GraalVM"""

    def get_script(self) -> Property[str]:
        raise NotImplementedError  # TODO: translate from Java

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_bindings(self, context: Context, language_id: str) -> Value:
        raise NotImplementedError  # TODO: translate from Java
