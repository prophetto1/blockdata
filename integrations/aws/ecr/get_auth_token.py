from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.models.tasks.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetAuthToken(AbstractConnection, RunnableTask):
    """Get an ECR authorization token"""

    def run(self, run_context: RunContext) -> TokenOutput:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> EcrClient:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TokenOutput(Output):
        token: EncryptedString | None = None


@dataclass(slots=True, kw_only=True)
class TokenOutput(Output):
    token: EncryptedString | None = None
