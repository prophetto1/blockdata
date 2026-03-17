from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-ldap\src\main\java\io\kestra\plugin\ldap\LdapConnection.java
# WARNING: Unresolved types: Exception, GeneralSecurityException, LDAPConnection, LDAPException

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from engine.core.exceptions.illegal_variable_evaluation_exception import IllegalVariableEvaluationException
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.http.client.configurations.ssl_options import SslOptions
from integrations.azure.batch.models.task import Task


@dataclass(slots=True, kw_only=True)
class LdapConnection(ABC, Task):
    hostname: Property[str]
    port: Property[str]
    user_dn: Property[str]
    password: Property[str]
    auth_method: Property[str] = Property.ofValue("simple")
    kdc: Property[str] | None = None
    realm: Property[str] | None = None
    ssl_options: SslOptions | None = None

    def get_ldap_connection(self, run_context: RunContext) -> LDAPConnection:
        raise NotImplementedError  # TODO: translate from Java

    def create_ldap_connection(self, hostname: str, port: int, trust_all_certificates: bool) -> LDAPConnection:
        raise NotImplementedError  # TODO: translate from Java
