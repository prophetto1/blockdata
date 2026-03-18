from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\ecr\GetAuthToken.java
# WARNING: Unresolved types: EcrClient, Exception

from dataclasses import dataclass
from typing import Any

from integrations.aws.abstract_connection import AbstractConnection
from engine.core.models.tasks.common.encrypted_string import EncryptedString
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.aws.glue.model.output import Output
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.runnable_task import RunnableTask


@dataclass(slots=True, kw_only=True)
class GetAuthToken(AbstractConnection):
    """Get an ECR authorization token"""

    def run(self, run_context: RunContext) -> TokenOutput:
        raise NotImplementedError  # TODO: translate from Java

    def client(self, run_context: RunContext) -> EcrClient:
        raise NotImplementedError  # TODO: translate from Java

    @dataclass(slots=True)
    class TokenOutput:
        token: EncryptedString | None = None
