from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.fivetran.models.connector import Connector


@dataclass(slots=True, kw_only=True)
class ConnectorResponse:
    code: str | None = None
    message: str | None = None
    data: Connector | None = None
