from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\MinioConnectionInterface.java
# WARNING: Unresolved types: MinioClientConfig

from typing import Any, Protocol

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from integrations.minio.minio_connection import MinioConnection
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.http.client.configurations.ssl_options import SslOptions


class MinioConnectionInterface(Protocol):
    def get_endpoint(self) -> Property[str]: ...

    def get_access_key_id(self) -> Property[str]: ...

    def get_secret_key_id(self) -> Property[str]: ...

    def get_region(self) -> Property[str]: ...

    def get_client_pem(self) -> Property[str]: ...

    def get_ca_pem(self) -> Property[str]: ...

    def get_ssl(self) -> SslOptions: ...

    def minio_client_config(self, run_context: RunContext) -> MinioConnection.MinioClientConfig: ...
