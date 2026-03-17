from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True, kw_only=True)
class MinioClientUtils:

    def with_pem_certificate(self, client_pem_is: InputStream, ca_pem: InputStream) -> OkHttpClient:
        raise NotImplementedError  # TODO: translate from Java

    def get_trust_manager(self, trust_manager_factory: TrustManagerFactory) -> X509TrustManager:
        raise NotImplementedError  # TODO: translate from Java
