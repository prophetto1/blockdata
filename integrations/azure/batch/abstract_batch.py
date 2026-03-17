from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from integrations.kubernetes.abstract_connection import AbstractConnection
from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class AbstractBatch(AbstractConnection):
    account: Property[str]
    access_key: Property[str]
