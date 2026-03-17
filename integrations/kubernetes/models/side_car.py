from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class SideCar:
    image: Property[str] | None = None
    resources: Property[dict[String, Object]] | None = None
    default_spec: Property[dict[String, Object]] | None = None
