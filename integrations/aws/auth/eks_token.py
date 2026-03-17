from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\auth\EksToken.java
# WARNING: Unresolved types: Exception, Region, core, io, kestra, models, tasks

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class EksToken(AbstractConnection):
    """Generate a presigned EKS authentication token"""
    cluster_name: Property[str]
    expiration_duration: Property[int] = Property.ofValue(600L)

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_sts_regional_endpoint_uri(run_context: RunContext, aws_region: Region) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output:
        token: Token

    @dataclass(slots=True)
    class Token:
        token_value: EncryptedString | None = None
        expiration_time: datetime | None = None
