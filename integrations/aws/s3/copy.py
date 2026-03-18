from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\Copy.java
# WARNING: Unresolved types: Exception, core, io, kestra, models, tasks

from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from integrations.aws.s3.abstract_s3 import AbstractS3
from integrations.aws.s3.object_output import ObjectOutput
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask
from integrations.aws.s3.models.s3_server_side_encryption import S3ServerSideEncryption


@dataclass(slots=True, kw_only=True)
class Copy(AbstractConnection):
    """Copy an object between S3 locations"""
    delete: Property[bool] = Property.ofValue(false)
    from: CopyObjectFrom | None = None
    to: CopyObject | None = None

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class CopyObject:
        bucket: Property[str]
        key: Property[str]
        server_side_encryption: Property[S3ServerSideEncryption] | None = None
        kms_key_id: Property[str] | None = None

    @dataclass(slots=True)
    class CopyObjectFrom(CopyObject):
        version_id: Property[str] | None = None

    @dataclass(slots=True)
    class Output(ObjectOutput):
        bucket: str | None = None
        key: str | None = None
