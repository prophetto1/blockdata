from __future__ import annotations

# Source: E:\KESTRA\script\src\main\java\io\kestra\plugin\scripts\runner\docker\Credentials.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class Credentials:
    """Credentials for a private container registry."""
    registry: Property[str] | None = None
    username: Property[str] | None = None
    password: Property[str] | None = None
    registry_token: Property[str] | None = None
    identity_token: Property[str] | None = None
    auth: Property[str] | None = None
