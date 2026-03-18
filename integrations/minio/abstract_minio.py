from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\AbstractMinio.java
# WARNING: Unresolved types: Exception, MinioAsyncClient, MinioClient, MinioClientConfig, OkHttpClient, X509Certificate, X509TrustManager, cert, java, security

from dataclasses import dataclass, field
from typing import Any, ClassVar, Protocol

from integrations.minio.minio_connection import MinioConnection
from integrations.minio.minio_connection_interface import MinioConnectionInterface
from engine.core.runners.run_context import RunContext


class AbstractMinio(MinioConnectionInterface, Protocol):
    def client(self, run_context: RunContext) -> MinioClient: ...

    def async_client(self, run_context: RunContext) -> MinioAsyncClient: ...

    def build_http_client(config: MinioConnection.MinioClientConfig, run_context: RunContext) -> OkHttpClient: ...
