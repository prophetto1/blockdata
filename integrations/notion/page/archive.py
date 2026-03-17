from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-notion\src\main\java\io\kestra\plugin\notion\page\Archive.java
# WARNING: Unresolved types: Exception

from dataclasses import dataclass
from typing import Any

from integrations.compress.abstract_task import AbstractTask
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Archive(AbstractTask):
    """Archive a Notion page"""

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_endpoint(self) -> str:
        raise NotImplementedError  # TODO: translate from Java
