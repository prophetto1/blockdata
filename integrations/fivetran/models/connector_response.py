from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-fivetran\src\main\java\io\kestra\plugin\fivetran\models\ConnectorResponse.java

from dataclasses import dataclass
from typing import Any

from integrations.fivetran.models.connector import Connector


@dataclass(slots=True, kw_only=True)
class ConnectorResponse:
    code: str | None = None
    message: str | None = None
    data: Connector | None = None
