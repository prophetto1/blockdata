from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\MinioConnection.java

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from integrations.minio.minio_connection_interface import MinioConnectionInterface
from engine.core.models.property.property import Property
from engine.core.http.client.configurations.ssl_options import SslOptions
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class MinioConnection(ABC, Task):
    region: Property[str] | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    endpoint: Property[str] | None = None
    client_pem: Property[str] | None = None
    ca_pem: Property[str] | None = None
    ssl: SslOptions | None = None

    @dataclass(slots=True)
    class MinioClientConfig:
        access_key_id: str | None = None
        secret_key_id: str | None = None
        region: str | None = None
        endpoint: str | None = None
        client_pem: str | None = None
        ca_pem: str | None = None
        ssl_options: SslOptions | None = None
