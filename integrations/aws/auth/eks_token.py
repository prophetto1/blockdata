from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from datetime import datetime

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class EksToken(AbstractConnection, RunnableTask):
    """Generate a presigned EKS authentication token"""
    cluster_name: Property[str]
    expiration_duration: Property[int]

    def run(self, run_context: RunContext) -> Output:
        raise NotImplementedError  # TODO: translate from Java

    def get_sts_regional_endpoint_uri(self, run_context: RunContext, aws_region: Region) -> str:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class Output(io):
        token: Token

    @dataclass(slots=True)
    class Token:
        token_value: EncryptedString | None = None
        expiration_time: datetime | None = None


@dataclass(slots=True, kw_only=True)
class Output(io):
    token: Token


@dataclass(slots=True, kw_only=True)
class Token:
    token_value: EncryptedString | None = None
    expiration_time: datetime | None = None
