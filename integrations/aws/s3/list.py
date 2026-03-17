from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\List.java
# WARNING: Unresolved types: Exception, Filter, core, io, java, kestra, models, tasks, util

from dataclasses import dataclass
from typing import Any

from integrations.aws.s3.abstract_s3_object import AbstractS3Object
from integrations.aws.s3.list_interface import ListInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.aws.s3.models.s3_object import S3Object


@dataclass(slots=True, kw_only=True)
class List(AbstractS3Object):
    """List objects in an S3 bucket"""
    max_keys: Property[int] = Property.ofValue(1000)
    max_files: Property[int] = Property.ofValue(25)
    filter: Property[Filter] = Property.ofValue(Filter.BOTH)
    prefix: Property[str] | None = None
    delimiter: Property[str] | None = None
    marker: Property[str] | None = None
    encoding_type: Property[str] | None = None
    expected_bucket_owner: Property[str] | None = None
    regexp: Property[str] | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        objects: java.util.List[S3Object] | None = None
