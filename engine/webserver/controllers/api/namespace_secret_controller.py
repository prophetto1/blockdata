from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\controllers\api\NamespaceSecretController.java
# WARNING: Unresolved types: META

from dataclasses import dataclass
from typing import Any

from engine.webserver.models.api.secret.api_secret_list_response import ApiSecretListResponse
from engine.webserver.models.api.secret.api_secret_meta import ApiSecretMeta
from engine.core.models.query_filter import QueryFilter
from engine.core.secret.secret_service import SecretService
from engine.core.tenant.tenant_service import TenantService


@dataclass(slots=True, kw_only=True)
class NamespaceSecretController:
    tenant_service: TenantService | None = None
    secret_service: SecretService[str] | None = None

    def list_namespace_secrets(self, namespace: str, page: int, size: int, sort: list[str], filters: list[QueryFilter]) -> HttpResponse[ApiSecretListResponse[META]]:
        raise NotImplementedError  # TODO: translate from Java

    def get_inherited_secrets(self, namespace: str) -> HttpResponse[dict[str, set[str]]]:
        raise NotImplementedError  # TODO: translate from Java
