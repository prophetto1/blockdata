from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from integrations.minio.minio_connection import MinioConnection
from integrations.minio.minio_connection_interface import MinioConnectionInterface
from engine.core.runners.run_context import RunContext


class AbstractMinio(MinioConnectionInterface):
    def client(self, run_context: RunContext) -> MinioClient: ...
    def async_client(self, run_context: RunContext) -> MinioAsyncClient: ...
    def build_http_client(self, config: MinioConnection, run_context: RunContext) -> OkHttpClient: ...


@dataclass(slots=True, kw_only=True)
class CustomTrustManager(X509TrustManager):
    i_n_s_t_a_n_c_e: CustomTrustManager | None = None

    def check_client_trusted(self, chain: java, auth_type: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def check_server_trusted(self, chain: java, auth_type: str) -> None:
        raise NotImplementedError  # TODO: translate from Java

    def get_accepted_issuers(self) -> java:
        raise NotImplementedError  # TODO: translate from Java
