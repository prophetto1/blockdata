from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-minio\src\main\java\io\kestra\plugin\minio\MinioClientUtils.java
# WARNING: Unresolved types: CertificateException, IOException, InputStream, KeyManagementException, KeyStoreException, NoSuchAlgorithmException, OkHttpClient, TrustManagerFactory, UnrecoverableKeyException, X509TrustManager

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True, kw_only=True)
class MinioClientUtils:

    @staticmethod
    def with_pem_certificate(client_pem_is: InputStream, ca_pem: InputStream) -> OkHttpClient:
        raise NotImplementedError  # TODO: translate from Java

    @staticmethod
    def get_trust_manager(trust_manager_factory: TrustManagerFactory) -> X509TrustManager:
        raise NotImplementedError  # TODO: translate from Java
