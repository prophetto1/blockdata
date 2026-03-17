from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.models.o_auth_token_provider import OAuthTokenProvider
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext


@dataclass(slots=True, kw_only=True)
class Connection:
    trust_certs: Property[bool] | None = None
    disable_hostname_verification: Property[bool] | None = None
    master_url: Property[str] | None = None
    api_version: Property[str] | None = None
    namespace: Property[str] | None = None
    ca_cert_file: Property[str] | None = None
    ca_cert_data: Property[str] | None = None
    client_cert_file: Property[str] | None = None
    client_cert_data: Property[str] | None = None
    client_key_file: Property[str] | None = None
    client_key_data: Property[str] | None = None
    client_key_algo: Property[str] | None = None
    client_key_passphrase: Property[str] | None = None
    trust_store_file: Property[str] | None = None
    trust_store_passphrase: Property[str] | None = None
    key_store_file: Property[str] | None = None
    key_store_passphrase: Property[str] | None = None
    oauth_token: Property[str] | None = None
    oauth_token_provider: OAuthTokenProvider | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None

    def to_config(self, run_context: RunContext) -> Config:
        raise NotImplementedError  # TODO: translate from Java

    def normalize_base64(self, run_context: RunContext, prop: Property[str]) -> str:
        raise NotImplementedError  # TODO: translate from Java
