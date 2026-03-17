from __future__ import annotations

from typing import Any, Protocol

from integrations.azure.abstract_connection_interface import AbstractConnectionInterface
from engine.core.runners.run_context import RunContext


class AbstractS3(AbstractConnectionInterface):
    def client(self, run_context: RunContext) -> S3Client: ...
    def async_client(self, run_context: RunContext) -> S3AsyncClient: ...
