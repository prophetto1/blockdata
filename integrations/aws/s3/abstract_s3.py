from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-aws\src\main\java\io\kestra\plugin\aws\s3\AbstractS3.java
# WARNING: Unresolved types: S3AsyncClient, S3Client

from typing import Any, Protocol

from integrations.aws.abstract_connection_interface import AbstractConnectionInterface
from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.runners.run_context import RunContext


class AbstractS3(AbstractConnectionInterface, Protocol):
    def client(self, run_context: RunContext) -> S3Client: ...

    def async_client(self, run_context: RunContext) -> S3AsyncClient: ...
