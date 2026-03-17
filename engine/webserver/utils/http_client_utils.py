from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\utils\HttpClientUtils.java
# WARNING: Unresolved types: Builder, CertificateException, KeyManagementException, KeyStoreException, NoSuchAlgorithmException, UnrecoverableKeyException

from dataclasses import dataclass
from typing import Any

from engine.core.http.client.http_client import HttpClient


@dataclass(slots=True, kw_only=True)
class HttpClientUtils:

    @staticmethod
    def with_pem_certificate(client_pem_is: Any, ca_pem: Any) -> HttpClient.Builder:
        raise NotImplementedError  # TODO: translate from Java
