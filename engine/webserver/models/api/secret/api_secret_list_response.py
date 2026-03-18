from __future__ import annotations

# Source: E:\KESTRA\webserver\src\main\java\io\kestra\webserver\models\api\secret\ApiSecretListResponse.java
# WARNING: Unresolved types: META

from dataclasses import dataclass
from typing import Any

from engine.webserver.models.api.secret.api_secret_meta import ApiSecretMeta


@dataclass(slots=True, kw_only=True)
class ApiSecretListResponse:
    read_only: bool | None = None
    results: list[META] | None = None
    total: int | None = None
