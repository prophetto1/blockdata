from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class Delete(AbstractS3Object, RunnableTask):
    """Delete a single S3 object"""
    key: Property[str]
    bypass_governance_retention: Property[bool] | None = None
    mfa: Property[str] | None = None
    request_payer: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        version_id: str | None = None
        delete_marker: bool | None = None
        request_charged: str | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    version_id: str | None = None
    delete_marker: bool | None = None
    request_charged: str | None = None
