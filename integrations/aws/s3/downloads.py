from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\Downloads.java
# WARNING: Unresolved types: Action, CopyObject, Exception, Filter, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.aws.s3.action_interface import ActionInterface
from integrations.aws.s3.copy import Copy
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.aws.s3.models.s3_object import S3Object


@dataclass(slots=True, kw_only=True)
class Downloads(AbstractS3Object):
    """Download multiple S3 objects"""
    max_keys: Property[int] = Property.ofValue(1000)
    compatibility_mode: Property[bool] = Property.ofValue(false)
    filter: Property[Filter] = Property.ofValue(Filter.BOTH)
    max_files: Property[int] = Property.ofValue(25)
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    encoding_type: Property[str] | None = None
    expected_bucket_owner: Property[str] | None = None
    regexp: Property[str] | None = None
    action: Property[ActionInterface.Action] | None = None
    move_to: Copy.CopyObject | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        objects: java.util.List[S3Object] | None = None
        output_files: dict[str, str] | None = None
