from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.azure.azure_identity_connection_interface import AzureIdentityConnectionInterface
from engine.core.models.property.property import Property
from engine.core.runners.run_context import RunContext
from engine.core.models.tasks.task import Task


@dataclass(slots=True, kw_only=True)
class AbstractAzureIdentityConnection(Task, AzureIdentityConnectionInterface):
    tenant_id: Property[str]
    client_id: Property[str] | None = None
    client_secret: Property[str] | None = None
    pem_certificate: Property[str] | None = None

    def credentials(self, run_context: RunContext) -> TokenCredential:
        raise NotImplementedError  # TODO: translate from Java

    def get_client_certificate_credential(self, tenant_id: str, client_id: str, pem_certificate: str) -> ClientCertificateCredential:
        raise NotImplementedError  # TODO: translate from Java

    def get_client_secret_credential(self, tenant_id: str, client_id: str, client_secret: str) -> ClientSecretCredential:
        raise NotImplementedError  # TODO: translate from Java
