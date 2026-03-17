from __future__ import annotations

# Source: E:\KESTRA-IO\plugins\plugin-kubernetes\src\main\java\io\kestra\plugin\kubernetes\models\SideCar.java

from dataclasses import dataclass
from typing import Any

from engine.core.models.property.property import Property


@dataclass(slots=True, kw_only=True)
class SideCar:
    image: Property[str] = Property.ofValue("busybox")
    resources: Property[dict[str, Any]] | None = None
    default_spec: Property[dict[str, Any]] | None = None
