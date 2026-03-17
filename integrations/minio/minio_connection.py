from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.minio.minio_connection_interface import MinioConnectionInterface
from engine.core.models.property.property import Property
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class MinioConnection(Task, MinioConnectionInterface):
    region: Property[str] | None = None
    access_key_id: Property[str] | None = None
    secret_key_id: Property[str] | None = None
    endpoint: Property[str] | None = None
    client_pem: Property[str] | None = None
    ca_pem: Property[str] | None = None
    ssl: SslOptions | None = None
