from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.http.client.configurations.ssl_options import SslOptions
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class LdapConnection(Task):
    hostname: Property[str]
    port: Property[str]
    user_dn: Property[str]
    password: Property[str]
    auth_method: Property[str] | None = None
    kdc: Property[str] | None = None
    realm: Property[str] | None = None
    ssl_options: SslOptions | None = None

    def get_ldap_connection(self, run_context: RunContext) -> LDAPConnection:
        raise NotImplementedError  # TODO: translate from Java

    def create_ldap_connection(self, hostname: str, port: int, trust_all_certificates: bool) -> LDAPConnection:
        raise NotImplementedError  # TODO: translate from Java
