from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.opensearch.abstract_task import AbstractTask
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class UploadFile(AbstractTask, RunnableTask):
    """Upload files to OpenAI storage"""
    from: Property[str]
    purpose: Property[str]

    def run(self, run_context: RunContext) -> UploadFile:
        raise NotImplementedError  # TODO: translate from Java

    def build_upload_create_params(self, purpose: str, filepath: str) -> UploadCreateParams:
        raise NotImplementedError  # TODO: translate from Java

    def get_file_purpose(self, purpose: str) -> FilePurpose:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        file_id: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    file_id: str | None = None
